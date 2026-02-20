import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import crypto from "crypto";
import express, { type Request, type Response, type Router } from "express";
import { storage } from "./storage";

interface McpUser {
  id: number;
  username: string;
  email: string;
}

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

function registerTools(server: McpServer, user: McpUser): void {
  // Tool 1: list_projects
  server.registerTool(
    "list_projects",
    {
      title: "List Projects",
      description: "List all projects accessible to the authenticated user.",
      inputSchema: {},
    },
    async () => {
      const projects = await storage.getProjectsForUser(user.id);
      const output = {
        projects: projects.map((p) => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          description: p.description,
          role: p.role,
          createdAt: p.createdAt.toISOString(),
        })),
      };
      return {
        content: [{ type: "text" as const, text: JSON.stringify(output, null, 2) }],
        structuredContent: output,
      };
    }
  );

  // Tool 2: create_project
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
        return {
          content: [{ type: "text" as const, text: "Error: A project with this slug already exists." }],
          isError: true,
        };
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

      const output = {
        id: project.id,
        name: project.name,
        slug: project.slug,
        description: project.description,
        createdAt: project.createdAt.toISOString(),
      };
      return {
        content: [{ type: "text" as const, text: JSON.stringify(output, null, 2) }],
        structuredContent: output,
      };
    }
  );

  // Tool 3: list_prompts
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
      const project = await storage.getProjectBySlug(projectSlug);
      if (!project) {
        return {
          content: [{ type: "text" as const, text: "Error: Project not found." }],
          isError: true,
        };
      }

      const member = await storage.getProjectMember(project.id, user.id);
      if (!member) {
        return {
          content: [{ type: "text" as const, text: "Error: Access denied to this project." }],
          isError: true,
        };
      }

      const prompts = await storage.getProjectPrompts(project.id);
      const output = {
        prompts: prompts.map((p) => ({
          id: p.id,
          slug: p.slug,
          title: p.title,
          category: p.category,
          createdAt: p.createdAt.toISOString(),
        })),
      };
      return {
        content: [{ type: "text" as const, text: JSON.stringify(output, null, 2) }],
        structuredContent: output,
      };
    }
  );

  // Tool 4: get_prompt
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
      const project = await storage.getProjectBySlug(projectSlug);
      if (!project) {
        return {
          content: [{ type: "text" as const, text: "Error: Project not found." }],
          isError: true,
        };
      }

      const member = await storage.getProjectMember(project.id, user.id);
      if (!member) {
        return {
          content: [{ type: "text" as const, text: "Error: Access denied to this project." }],
          isError: true,
        };
      }

      const prompt = await storage.getPromptBySlug(project.id, slug);
      if (!prompt) {
        return {
          content: [{ type: "text" as const, text: "Error: Prompt not found." }],
          isError: true,
        };
      }

      let promptVersion;
      if (version !== undefined) {
        const versions = await storage.getPromptVersions(prompt.id);
        promptVersion = versions.find((v) => v.version === version);
      } else {
        promptVersion = await storage.getLatestPromptVersion(prompt.id);
      }

      if (!promptVersion) {
        return {
          content: [{ type: "text" as const, text: "Error: Prompt version not found." }],
          isError: true,
        };
      }

      const output = {
        slug: prompt.slug,
        title: prompt.title,
        category: prompt.category,
        version: promptVersion.version,
        content: promptVersion.content,
        message: promptVersion.message,
        createdAt: promptVersion.createdAt.toISOString(),
      };
      return {
        content: [{ type: "text" as const, text: JSON.stringify(output, null, 2) }],
        structuredContent: output,
      };
    }
  );

  // Tool 5: save_prompt
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
      const project = await storage.getProjectBySlug(projectSlug);
      if (!project) {
        return {
          content: [{ type: "text" as const, text: "Error: Project not found." }],
          isError: true,
        };
      }

      const member = await storage.getProjectMember(project.id, user.id);
      if (!member || (member.role !== "editor" && member.role !== "admin")) {
        return {
          content: [
            { type: "text" as const, text: "Error: Requires editor role or higher." },
          ],
          isError: true,
        };
      }

      let prompt = await storage.getPromptBySlug(project.id, slug);
      if (!prompt) {
        prompt = await storage.createPrompt({
          slug,
          title: slug
            .replace(/-/g, " ")
            .replace(/\b\w/g, (l) => l.toUpperCase()),
          category: "general",
          projectId: project.id,
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

      const output = {
        promptId: prompt.id,
        versionId: versionRecord.id,
        version: versionRecord.version,
        slug: prompt.slug,
        content: versionRecord.content,
        message: versionRecord.message,
        createdAt: versionRecord.createdAt.toISOString(),
      };
      return {
        content: [{ type: "text" as const, text: JSON.stringify(output, null, 2) }],
        structuredContent: output,
      };
    }
  );

  // Tool 6: list_api_keys
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
      const output = {
        apiKeys: keys.map((key) => ({
          id: key.id,
          name: key.name,
          description: key.description,
          maskedKey: `${key.keyPrefix}${"*".repeat(44)}`,
          isActive: key.isActive,
          lastUsedAt: key.lastUsedAt?.toISOString() ?? null,
          createdAt: key.createdAt.toISOString(),
        })),
      };
      return {
        content: [{ type: "text" as const, text: JSON.stringify(output, null, 2) }],
        structuredContent: output,
      };
    }
  );
}

function createMcpServer(user: McpUser): McpServer {
  const server = new McpServer({
    name: "promptvault",
    version: "1.0.0",
  });
  registerTools(server, user);
  return server;
}

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
