import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import crypto from "crypto";
import express, { type Request, type Response, type Router } from "express";
import { storage } from "./storage";
import { optimizePrompt } from "./prompt-optimizer";

// ─── Types ───────────────────────────────────────────────────────────────────

interface McpUser {
  id: number;
  username: string;
  email: string;
}

// ─── Auth ────────────────────────────────────────────────────────────────────

async function validateApiKey(apiKey: string): Promise<McpUser | null> {
  if (!apiKey || !apiKey.startsWith("pk_")) {
    return null;
  }

  const keyHash = crypto.createHash("sha256").update(apiKey).digest("hex");
  const apiKeyRecord = await storage.getApiKeyByHash(keyHash);

  if (!apiKeyRecord || !apiKeyRecord.isActive) {
    return null;
  }

  // Update last used timestamp (fire and forget)
  storage.updateApiKey(apiKeyRecord.id, { lastUsedAt: new Date() });

  const user = await storage.getUser(apiKeyRecord.userId);
  if (!user) {
    return null;
  }

  return { id: user.id, username: user.username, email: user.email };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Resolve project + verify membership. Returns error response or { project, member }. */
async function resolveProject(projectSlug: string, userId: number) {
  const project = await storage.getProjectBySlug(projectSlug);
  if (!project) {
    return { error: "Error: Project not found." };
  }
  const member = await storage.getProjectMember(project.id, userId);
  if (!member) {
    return { error: "Error: Access denied to this project." };
  }
  return { project, member };
}

/** Resolve project + prompt + verify membership. */
async function resolvePrompt(projectSlug: string, slug: string, userId: number) {
  const result = await resolveProject(projectSlug, userId);
  if ("error" in result) return result;
  const prompt = await storage.getPromptBySlug(result.project.id, slug);
  if (!prompt) {
    return { error: "Error: Prompt not found." };
  }
  return { ...result, prompt };
}

function errorResult(message: string) {
  return {
    content: [{ type: "text" as const, text: message }],
    isError: true,
  };
}

function jsonResult(data: Record<string, any>) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
    structuredContent: data,
  };
}

function requireEditor(role: string) {
  return role === "editor" || role === "admin";
}

/** Decrypt a stored OpenRouter key. */
function decryptOpenRouterKey(encryptedKey: string): string {
  const encryptionKey = process.env.SESSION_SECRET || "dev-secret";
  const decipher = crypto.createDecipheriv(
    "aes-256-cbc",
    crypto.scryptSync(encryptionKey, "salt", 32),
    Buffer.alloc(16, 0),
  );
  let decrypted = decipher.update(encryptedKey, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

/** Get the decrypted OpenRouter key for a user (by keyId or default). */
async function getDecryptedOpenRouterKey(userId: number, keyId?: number): Promise<string | null> {
  let key;
  if (keyId) {
    key = await storage.getUserOpenRouterKey(keyId);
    if (!key || key.userId !== userId) return null;
  } else {
    const keys = await storage.getUserOpenRouterKeys(userId);
    key = keys.find((k) => k.isDefault) || keys[0];
  }
  if (!key) return null;
  return decryptOpenRouterKey(key.encryptedKey);
}

// ─── Tool Registration ──────────────────────────────────────────────────────
//
// Tools are organized into 4 groups by naming prefix so models can scan the
// tool list without being overwhelmed:
//
//   Projects & Prompts (core CRUD):
//     list_projects, create_project, list_prompts, get_prompt,
//     save_prompt, list_prompt_versions, list_api_keys
//
//   Optimization (DSPy):
//     optimize_prompt, list_optimizations
//
//   Datasets (Q&A examples for optimization):
//     list_datasets, create_dataset, update_dataset, delete_dataset
//
//   OpenRouter Keys:
//     list_openrouter_keys, add_openrouter_key,
//     delete_openrouter_key, set_default_openrouter_key

function registerTools(server: McpServer, user: McpUser): void {
  // ── Projects & Prompts ───────────────────────────────────────────────────

  server.registerTool(
    "list_projects",
    {
      title: "List Projects",
      description: "List all projects accessible to the authenticated user.",
      inputSchema: {},
    },
    async () => {
      const projects = await storage.getProjectsForUser(user.id);
      return jsonResult({
        projects: projects.map((p) => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          description: p.description,
          role: p.role,
          createdAt: p.createdAt.toISOString(),
        })),
      });
    },
  );

  server.registerTool(
    "create_project",
    {
      title: "Create Project",
      description:
        "Create a new project with a unique slug. The authenticated user becomes the admin.",
      inputSchema: {
        name: z.string().min(1).describe("Project display name"),
        slug: z
          .string()
          .min(1)
          .regex(/^[a-z0-9-]+$/)
          .describe("URL-friendly identifier (lowercase, hyphens only)"),
        description: z.string().optional().describe("Project description"),
      },
    },
    async ({ name, slug, description }) => {
      const existing = await storage.getProjectBySlug(slug);
      if (existing) {
        return errorResult("Error: A project with this slug already exists.");
      }

      const project = await storage.createProject({
        name,
        slug,
        description: description ?? null,
        ownerId: user.id,
      });

      await storage.addProjectMember({
        projectId: project.id,
        userId: user.id,
        role: "admin",
      });

      return jsonResult({
        id: project.id,
        name: project.name,
        slug: project.slug,
        description: project.description,
        createdAt: project.createdAt.toISOString(),
      });
    },
  );

  server.registerTool(
    "list_prompts",
    {
      title: "List Prompts",
      description: "List all prompts in a project. Requires viewer access or higher.",
      inputSchema: {
        projectSlug: z.string().min(1).describe("Project slug identifier"),
      },
    },
    async ({ projectSlug }) => {
      const result = await resolveProject(projectSlug, user.id);
      if ("error" in result) return errorResult(result.error);

      const prompts = await storage.getProjectPrompts(result.project.id);
      return jsonResult({
        prompts: prompts.map((p) => ({
          id: p.id,
          slug: p.slug,
          title: p.title,
          category: p.category,
          createdAt: p.createdAt.toISOString(),
        })),
      });
    },
  );

  server.registerTool(
    "get_prompt",
    {
      title: "Get Prompt",
      description:
        "Retrieve a prompt's content by slug. Returns the latest version unless a specific version number is provided.",
      inputSchema: {
        slug: z.string().min(1).describe("Prompt slug identifier"),
        projectSlug: z.string().min(1).describe("Project slug where the prompt belongs"),
        version: z
          .number()
          .int()
          .positive()
          .optional()
          .describe("Specific version number (omit for latest)"),
      },
    },
    async ({ slug, projectSlug, version }) => {
      const result = await resolvePrompt(projectSlug, slug, user.id);
      if ("error" in result) return errorResult(result.error);

      let promptVersion;
      if (version !== undefined) {
        const versions = await storage.getPromptVersions(result.prompt.id);
        promptVersion = versions.find((v) => v.version === version);
      } else {
        promptVersion = await storage.getLatestPromptVersion(result.prompt.id);
      }

      if (!promptVersion) {
        return errorResult("Error: Prompt version not found.");
      }

      return jsonResult({
        slug: result.prompt.slug,
        title: result.prompt.title,
        category: result.prompt.category,
        version: promptVersion.version,
        content: promptVersion.content,
        message: promptVersion.message,
        createdAt: promptVersion.createdAt.toISOString(),
      });
    },
  );

  server.registerTool(
    "save_prompt",
    {
      title: "Save Prompt",
      description:
        "Create a new prompt or save a new version of an existing prompt. Auto-creates the prompt if it doesn't exist and auto-increments the version number. Requires editor role or higher.",
      inputSchema: {
        slug: z
          .string()
          .min(1)
          .regex(/^[a-z0-9-]+$/)
          .describe("Prompt slug identifier (lowercase, hyphens only)"),
        projectSlug: z.string().min(1).describe("Project slug where the prompt belongs"),
        content: z.string().min(1).describe("The prompt content/template text"),
        message: z
          .string()
          .optional()
          .describe("Version commit message describing the change"),
      },
    },
    async ({ slug, projectSlug, content, message }) => {
      const result = await resolveProject(projectSlug, user.id);
      if ("error" in result) return errorResult(result.error);
      if (!requireEditor(result.member.role)) {
        return errorResult("Error: Requires editor role or higher.");
      }

      let prompt = await storage.getPromptBySlug(result.project.id, slug);
      if (!prompt) {
        prompt = await storage.createPrompt({
          slug,
          title: slug.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
          category: "general",
          projectId: result.project.id,
        });
      }

      const existingVersions = await storage.getPromptVersions(prompt.id);
      const nextVersion =
        existingVersions.length > 0
          ? Math.max(...existingVersions.map((v) => v.version)) + 1
          : 1;

      const versionRecord = await storage.createPromptVersion({
        promptId: prompt.id,
        version: nextVersion,
        content,
        message: message || `Version ${nextVersion}`,
        authorId: user.id,
      });

      return jsonResult({
        promptId: prompt.id,
        versionId: versionRecord.id,
        version: versionRecord.version,
        slug: prompt.slug,
        content: versionRecord.content,
        message: versionRecord.message,
        createdAt: versionRecord.createdAt.toISOString(),
      });
    },
  );

  server.registerTool(
    "list_prompt_versions",
    {
      title: "List Prompt Versions",
      description: "List all versions of a prompt with author info, ordered newest first.",
      inputSchema: {
        slug: z.string().min(1).describe("Prompt slug identifier"),
        projectSlug: z.string().min(1).describe("Project slug where the prompt belongs"),
      },
    },
    async ({ slug, projectSlug }) => {
      const result = await resolvePrompt(projectSlug, slug, user.id);
      if ("error" in result) return errorResult(result.error);

      const versions = await storage.getPromptVersions(result.prompt.id);
      return jsonResult({
        promptSlug: result.prompt.slug,
        versions: versions.map((v) => ({
          id: v.id,
          version: v.version,
          content: v.content,
          message: v.message,
          author: { id: v.author.id, username: v.author.username },
          createdAt: v.createdAt.toISOString(),
        })),
      });
    },
  );

  server.registerTool(
    "list_api_keys",
    {
      title: "List API Keys",
      description:
        "List all API keys for the authenticated user. Key values are masked for security.",
      inputSchema: {},
    },
    async () => {
      const keys = await storage.getUserApiKeys(user.id);
      return jsonResult({
        apiKeys: keys.map((key) => ({
          id: key.id,
          name: key.name,
          description: key.description,
          maskedKey: `${key.keyPrefix}${"*".repeat(44)}`,
          isActive: key.isActive,
          lastUsedAt: key.lastUsedAt?.toISOString() ?? null,
          createdAt: key.createdAt.toISOString(),
        })),
      });
    },
  );

  // ── Optimization (DSPy) ──────────────────────────────────────────────────

  server.registerTool(
    "optimize_prompt",
    {
      title: "Optimize Prompt",
      description:
        "Run DSPy-style prompt optimization. Provide either an openrouterKey directly or a keyId referencing a stored key. Supply Q&A examples inline or via datasetId. Requires editor role. This may take a while.",
      inputSchema: {
        slug: z.string().min(1).describe("Prompt slug identifier"),
        projectSlug: z.string().min(1).describe("Project slug"),
        content: z.string().min(1).describe("The prompt content to optimize"),
        qaExamples: z
          .array(
            z.object({
              question: z.string().min(1),
              answer: z.string().min(1),
            }),
          )
          .min(3)
          .optional()
          .describe("At least 3 Q&A examples (required if no datasetId)"),
        datasetId: z
          .number()
          .int()
          .positive()
          .optional()
          .describe("ID of a saved dataset to use instead of inline qaExamples"),
        settings: z
          .object({
            model: z.string().describe("Model name for optimization (e.g. 'openai/gpt-4o')"),
            judgeModel: z.string().optional().describe("Model to judge quality"),
            optimizer: z
              .enum(["bootstrap", "bootstrap_random", "mipro", "copro"])
              .describe("Optimization strategy"),
            metric: z
              .enum(["exact", "contains", "semantic", "combined", "llm_judge", "llm_judge_strict"])
              .describe("Evaluation metric"),
            threshold: z.number().min(0).max(1).optional().describe("Score threshold (0-1)"),
            maxIterations: z.number().min(1).max(10).optional().describe("Max iterations (1-10)"),
            trials: z.number().min(1).max(50).optional().describe("Number of trials (1-50)"),
            demos: z.number().min(1).max(10).optional().describe("Number of demos (1-10)"),
          })
          .describe("Optimization settings"),
        openrouterKey: z
          .string()
          .optional()
          .describe("OpenRouter API key (sk-or-...). Omit to use a stored key."),
        keyId: z
          .number()
          .int()
          .positive()
          .optional()
          .describe("ID of a stored OpenRouter key to use"),
      },
    },
    async ({ slug, projectSlug, content, qaExamples, datasetId, settings, openrouterKey, keyId }) => {
      // Auth & access
      const result = await resolveProject(projectSlug, user.id);
      if ("error" in result) return errorResult(result.error);
      if (!requireEditor(result.member.role)) {
        return errorResult("Error: Requires editor role or higher.");
      }

      // Resolve OpenRouter key
      let resolvedKey = openrouterKey;
      if (!resolvedKey) {
        resolvedKey = await getDecryptedOpenRouterKey(user.id, keyId) ?? undefined;
      }
      if (!resolvedKey) {
        return errorResult("Error: No OpenRouter API key provided. Pass openrouterKey or keyId.");
      }

      // Resolve Q&A examples
      let resolvedExamples = qaExamples;
      const prompt = await storage.getPromptBySlug(result.project.id, slug);

      if (!resolvedExamples && datasetId) {
        const dataset = await storage.getOptimizationDataset(datasetId);
        if (!dataset || (prompt && dataset.promptId !== prompt.id)) {
          return errorResult("Error: Dataset not found or does not belong to this prompt.");
        }
        resolvedExamples = JSON.parse(dataset.examples);
      }

      if (!resolvedExamples || resolvedExamples.length < 3) {
        return errorResult("Error: At least 3 Q&A examples required (inline or via datasetId).");
      }

      // Create optimization record
      const optimizationRecord = await storage.createPromptOptimization({
        promptId: prompt?.id || 0,
        originalContent: content,
        qaExamples: JSON.stringify(resolvedExamples),
        settings: JSON.stringify(settings),
        status: "running",
        authorId: user.id,
      });

      try {
        const optimResult = await optimizePrompt(resolvedKey, content, resolvedExamples, settings);

        await storage.updatePromptOptimization(optimizationRecord.id, {
          status: "completed",
          optimizedContent: optimResult.optimizedContent,
          baselineScore: optimResult.baselineScore.toString(),
          optimizedScore: optimResult.optimizedScore.toString(),
          iterations: JSON.stringify(optimResult.iterations),
          completedAt: new Date(),
        });

        return jsonResult({
          optimizationId: optimizationRecord.id,
          optimizedContent: optimResult.optimizedContent,
          baselineScore: optimResult.baselineScore,
          optimizedScore: optimResult.optimizedScore,
          iterations: optimResult.iterations,
          judgeRemarks: optimResult.judgeRemarks,
        });
      } catch (err: any) {
        await storage.updatePromptOptimization(optimizationRecord.id, {
          status: "failed",
          errorMessage: err.message,
          completedAt: new Date(),
        }).catch(() => {});

        return errorResult(`Error: Optimization failed — ${err.message}`);
      }
    },
  );

  server.registerTool(
    "list_optimizations",
    {
      title: "List Optimizations",
      description: "Get optimization history for a prompt, ordered newest first.",
      inputSchema: {
        slug: z.string().min(1).describe("Prompt slug identifier"),
        projectSlug: z.string().min(1).describe("Project slug"),
      },
    },
    async ({ slug, projectSlug }) => {
      const result = await resolvePrompt(projectSlug, slug, user.id);
      if ("error" in result) return errorResult(result.error);

      const optimizations = await storage.getPromptOptimizations(result.prompt.id);
      return jsonResult({
        optimizations: optimizations.map((o) => ({
          id: o.id,
          status: o.status,
          originalContent: o.originalContent,
          optimizedContent: o.optimizedContent,
          baselineScore: o.baselineScore ? parseFloat(o.baselineScore) : null,
          optimizedScore: o.optimizedScore ? parseFloat(o.optimizedScore) : null,
          settings: JSON.parse(o.settings),
          errorMessage: o.errorMessage,
          author: { id: o.author.id, username: o.author.username },
          createdAt: o.createdAt.toISOString(),
          completedAt: o.completedAt?.toISOString() ?? null,
        })),
      });
    },
  );

  // ── Datasets (Q&A examples for optimization) ────────────────────────────

  server.registerTool(
    "list_datasets",
    {
      title: "List Datasets",
      description: "List Q&A datasets saved for a prompt's optimization.",
      inputSchema: {
        slug: z.string().min(1).describe("Prompt slug identifier"),
        projectSlug: z.string().min(1).describe("Project slug"),
      },
    },
    async ({ slug, projectSlug }) => {
      const result = await resolvePrompt(projectSlug, slug, user.id);
      if ("error" in result) return errorResult(result.error);

      const datasets = await storage.getOptimizationDatasets(result.prompt.id);
      return jsonResult({
        datasets: datasets.map((d) => ({
          id: d.id,
          name: d.name,
          description: d.description,
          examples: JSON.parse(d.examples),
          createdAt: d.createdAt.toISOString(),
          updatedAt: d.updatedAt.toISOString(),
        })),
      });
    },
  );

  server.registerTool(
    "create_dataset",
    {
      title: "Create Dataset",
      description:
        "Create a Q&A dataset for prompt optimization. Requires editor role or higher.",
      inputSchema: {
        slug: z.string().min(1).describe("Prompt slug identifier"),
        projectSlug: z.string().min(1).describe("Project slug"),
        name: z.string().min(1).describe("Dataset name"),
        description: z.string().optional().describe("Dataset description"),
        examples: z
          .array(
            z.object({
              question: z.string().min(1).describe("Input question"),
              answer: z.string().min(1).describe("Expected answer"),
            }),
          )
          .min(1)
          .describe("Array of Q&A examples"),
      },
    },
    async ({ slug, projectSlug, name, description, examples }) => {
      const result = await resolvePrompt(projectSlug, slug, user.id);
      if ("error" in result) return errorResult(result.error);
      if (!requireEditor(result.member.role)) {
        return errorResult("Error: Requires editor role or higher.");
      }

      const dataset = await storage.createOptimizationDataset({
        promptId: result.prompt.id,
        name,
        description: description ?? null,
        examples: JSON.stringify(examples),
      });

      return jsonResult({
        id: dataset.id,
        name: dataset.name,
        description: dataset.description,
        examples,
        createdAt: dataset.createdAt.toISOString(),
        updatedAt: dataset.updatedAt.toISOString(),
      });
    },
  );

  server.registerTool(
    "update_dataset",
    {
      title: "Update Dataset",
      description:
        "Update a Q&A dataset's name, description, or examples. Requires editor role.",
      inputSchema: {
        datasetId: z.number().int().positive().describe("Dataset ID"),
        name: z.string().min(1).optional().describe("New dataset name"),
        description: z.string().optional().describe("New description"),
        examples: z
          .array(
            z.object({
              question: z.string().min(1),
              answer: z.string().min(1),
            }),
          )
          .min(1)
          .optional()
          .describe("Replacement Q&A examples (replaces all existing)"),
      },
    },
    async ({ datasetId, name, description, examples }) => {
      const dataset = await storage.getOptimizationDataset(datasetId);
      if (!dataset) return errorResult("Error: Dataset not found.");

      const prompt = await storage.getPrompt(dataset.promptId);
      if (!prompt) return errorResult("Error: Prompt not found.");

      const project = await storage.getProject(prompt.projectId);
      if (!project) return errorResult("Error: Project not found.");

      const member = await storage.getProjectMember(project.id, user.id);
      if (!member || !requireEditor(member.role)) {
        return errorResult("Error: Requires editor role or higher.");
      }

      const updates: Record<string, any> = {};
      if (name !== undefined) updates.name = name;
      if (description !== undefined) updates.description = description;
      if (examples !== undefined) updates.examples = JSON.stringify(examples);

      const updated = await storage.updateOptimizationDataset(datasetId, updates);
      if (!updated) return errorResult("Error: Failed to update dataset.");

      return jsonResult({
        id: updated.id,
        name: updated.name,
        description: updated.description,
        examples: JSON.parse(updated.examples),
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      });
    },
  );

  server.registerTool(
    "delete_dataset",
    {
      title: "Delete Dataset",
      description: "Delete a Q&A dataset. Requires editor role.",
      inputSchema: {
        datasetId: z.number().int().positive().describe("Dataset ID to delete"),
      },
    },
    async ({ datasetId }) => {
      const dataset = await storage.getOptimizationDataset(datasetId);
      if (!dataset) return errorResult("Error: Dataset not found.");

      const prompt = await storage.getPrompt(dataset.promptId);
      if (!prompt) return errorResult("Error: Prompt not found.");

      const project = await storage.getProject(prompt.projectId);
      if (!project) return errorResult("Error: Project not found.");

      const member = await storage.getProjectMember(project.id, user.id);
      if (!member || !requireEditor(member.role)) {
        return errorResult("Error: Requires editor role or higher.");
      }

      await storage.deleteOptimizationDataset(datasetId);
      return jsonResult({ deleted: true, datasetId });
    },
  );

  // ── OpenRouter Keys ──────────────────────────────────────────────────────

  server.registerTool(
    "list_openrouter_keys",
    {
      title: "List OpenRouter Keys",
      description: "List stored OpenRouter API keys (metadata only, keys are never exposed).",
      inputSchema: {},
    },
    async () => {
      const keys = await storage.getUserOpenRouterKeys(user.id);
      return jsonResult({
        keys: keys.map((k) => ({
          id: k.id,
          name: k.name,
          keyPrefix: k.keyPrefix,
          isDefault: k.isDefault,
          createdAt: k.createdAt.toISOString(),
        })),
      });
    },
  );

  server.registerTool(
    "add_openrouter_key",
    {
      title: "Add OpenRouter Key",
      description:
        "Store an OpenRouter API key (encrypted). First key added becomes the default.",
      inputSchema: {
        name: z.string().min(1).describe("Display name for this key"),
        apiKey: z
          .string()
          .min(1)
          .describe("OpenRouter API key (must start with sk-or-)"),
      },
    },
    async ({ name, apiKey }) => {
      if (!apiKey.startsWith("sk-or-")) {
        return errorResult("Error: Invalid OpenRouter API key format. Must start with sk-or-.");
      }

      const encryptionKey = process.env.SESSION_SECRET || "dev-secret";
      const cipher = crypto.createCipheriv(
        "aes-256-cbc",
        crypto.scryptSync(encryptionKey, "salt", 32),
        Buffer.alloc(16, 0),
      );
      let encryptedKey = cipher.update(apiKey, "utf8", "hex");
      encryptedKey += cipher.final("hex");

      const keyPrefix = apiKey.substring(0, 12) + "...";
      const existingKeys = await storage.getUserOpenRouterKeys(user.id);
      const isDefault = existingKeys.length === 0;

      const newKey = await storage.createUserOpenRouterKey({
        userId: user.id,
        name,
        encryptedKey,
        keyPrefix,
        isDefault,
      });

      return jsonResult({
        id: newKey.id,
        name: newKey.name,
        keyPrefix: newKey.keyPrefix,
        isDefault: newKey.isDefault,
        createdAt: newKey.createdAt.toISOString(),
      });
    },
  );

  server.registerTool(
    "delete_openrouter_key",
    {
      title: "Delete OpenRouter Key",
      description: "Delete a stored OpenRouter API key.",
      inputSchema: {
        keyId: z.number().int().positive().describe("OpenRouter key ID to delete"),
      },
    },
    async ({ keyId }) => {
      const key = await storage.getUserOpenRouterKey(keyId);
      if (!key || key.userId !== user.id) {
        return errorResult("Error: Key not found.");
      }

      await storage.deleteUserOpenRouterKey(keyId);
      return jsonResult({ deleted: true, keyId });
    },
  );

  server.registerTool(
    "set_default_openrouter_key",
    {
      title: "Set Default OpenRouter Key",
      description: "Set which stored OpenRouter key is used by default for optimizations.",
      inputSchema: {
        keyId: z.number().int().positive().describe("OpenRouter key ID to make default"),
      },
    },
    async ({ keyId }) => {
      const key = await storage.getUserOpenRouterKey(keyId);
      if (!key || key.userId !== user.id) {
        return errorResult("Error: Key not found.");
      }

      await storage.setDefaultOpenRouterKey(user.id, keyId);
      return jsonResult({ success: true, defaultKeyId: keyId });
    },
  );
}

// ─── Server Factory ──────────────────────────────────────────────────────────

function createMcpServer(user: McpUser): McpServer {
  const server = new McpServer({
    name: "promptvault",
    version: "1.0.0",
  });
  registerTools(server, user);
  return server;
}

// ─── Express Router ──────────────────────────────────────────────────────────

export function createMcpRouter(): Router {
  const router = express.Router();

  router.post("/:apiKey", async (req: Request, res: Response) => {
    try {
      const user = await validateApiKey(req.params.apiKey);
      if (!user) {
        res.status(403).json({ error: "Invalid or inactive API key" });
        return;
      }

      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
      });

      const server = createMcpServer(user);
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);

      res.on("close", () => {
        transport.close();
        server.close();
      });
    } catch (error) {
      console.error("MCP request error:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Internal server error" });
      }
    }
  });

  router.get("/:apiKey", (_req: Request, res: Response) => {
    res.status(405).json({ error: "Method not allowed in stateless mode" });
  });

  router.delete("/:apiKey", (_req: Request, res: Response) => {
    res.status(405).json({ error: "Method not allowed in stateless mode" });
  });

  return router;
}
