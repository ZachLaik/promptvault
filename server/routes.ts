import type { Express } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { storage } from "./storage";
import { authenticateSession, authenticateApiKey, checkProjectAccess, type AuthenticatedRequest } from "./middleware/auth";
import {
  loginSchema,
  signupSchema,
  insertProjectSchema,
  insertPromptSchema,
  insertPromptVersionSchema,
  insertApiKeySchema,
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Session configuration
  app.use(session({
    secret: process.env.SESSION_SECRET || "development-secret-change-in-production",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  }));

  // Auth routes
  app.post("/api/auth/signup", async (req, res) => {
    try {
      const data = signupSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(data.email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(data.password, 12);
      
      // Create user
      const user = await storage.createUser({
        ...data,
        password: hashedPassword,
      });

      // Set session
      (req.session as any).userId = user.id;

      res.json({
        id: user.id,
        username: user.username,
        email: user.email,
      });
    } catch (error) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const data = loginSchema.parse(req.body);
      
      const user = await storage.getUserByEmail(data.email);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const isValidPassword = await bcrypt.compare(data.password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Set session
      (req.session as any).userId = user.id;

      res.json({
        id: user.id,
        username: user.username,
        email: user.email,
      });
    } catch (error) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/me", authenticateSession, (req: AuthenticatedRequest, res) => {
    res.json(req.user);
  });

  // Project routes
  app.get("/api/projects", authenticateSession, async (req: AuthenticatedRequest, res) => {
    try {
      const projects = await storage.getProjectsForUser(req.user!.id);
      res.json(projects);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  app.post("/api/projects", authenticateSession, async (req: AuthenticatedRequest, res) => {
    try {
      const data = insertProjectSchema.parse(req.body);
      
      // Check if slug is unique
      const existingProject = await storage.getProjectBySlug(data.slug);
      if (existingProject) {
        return res.status(400).json({ message: "Project slug already exists" });
      }

      const project = await storage.createProject({
        name: data.name,
        slug: data.slug,
        description: data.description,
        ownerId: req.user!.id,
      });

      // Add creator as admin
      await storage.addProjectMember({
        projectId: project.id,
        userId: req.user!.id,
        role: "admin",
      });

      res.json(project);
    } catch (error) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.get("/api/projects/:projectId", authenticateSession, async (req: AuthenticatedRequest, res) => {
    try {
      await checkProjectAccess(req, res, () => {}, "viewer");
      
      const projectId = parseInt(req.params.projectId);
      const project = await storage.getProject(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      res.json(project);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch project" });
    }
  });

  // Prompt routes
  app.get("/api/projects/:projectId/prompts", authenticateSession, async (req: AuthenticatedRequest, res) => {
    try {
      await checkProjectAccess(req, res, () => {}, "viewer");
      
      const projectId = parseInt(req.params.projectId);
      const prompts = await storage.getProjectPrompts(projectId);
      res.json(prompts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch prompts" });
    }
  });

  app.post("/api/projects/:projectId/prompts", authenticateSession, async (req: AuthenticatedRequest, res) => {
    try {
      await checkProjectAccess(req, res, () => {}, "editor");
      
      const projectId = parseInt(req.params.projectId);
      const data = insertPromptSchema.parse({
        ...req.body,
        projectId,
      });

      const prompt = await storage.createPrompt(data);
      res.json(prompt);
    } catch (error) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  // Prompt version routes - both session and API key auth
  app.post("/api/prompts/:slug", async (req: AuthenticatedRequest, res) => {
    // Try session auth first, then API key auth
    try {
      await authenticateSession(req, res, () => {});
    } catch {
      try {
        await authenticateApiKey(req, res, () => {});
      } catch {
        return res.status(401).json({ message: "Authentication required" });
      }
    }
    try {
      const { slug } = req.params;
      const { content, message, projectSlug } = req.body;

      if (!projectSlug) {
        return res.status(400).json({ message: "Project slug required" });
      }

      const project = await storage.getProjectBySlug(projectSlug);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check if user has editor access
      const member = await storage.getProjectMember(project.id, req.user!.id);
      if (!member || (member.role !== "editor" && member.role !== "admin")) {
        return res.status(403).json({ message: "Requires editor role or higher" });
      }

      let prompt = await storage.getPromptBySlug(project.id, slug);
      
      if (!prompt) {
        // Create new prompt
        prompt = await storage.createPrompt({
          slug,
          title: slug.replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase()),
          category: "general",
          projectId: project.id,
        });
      }

      // Get the next version number
      const existingVersions = await storage.getPromptVersions(prompt.id);
      const nextVersion = existingVersions.length > 0 ? Math.max(...existingVersions.map(v => v.version)) + 1 : 1;

      const version = await storage.createPromptVersion({
        promptId: prompt.id,
        version: nextVersion,
        content,
        message: message || `Version ${nextVersion}`,
        authorId: req.user!.id,
      });

      res.json(version);
    } catch (error) {
      res.status(500).json({ message: "Failed to create prompt version" });
    }
  });

  app.get("/api/prompts/:slug", [authenticateSession, authenticateApiKey], async (req: AuthenticatedRequest, res) => {
    try {
      const { slug } = req.params;
      const { version, projectSlug } = req.query;

      if (!projectSlug) {
        return res.status(400).json({ message: "Project slug required" });
      }

      const project = await storage.getProjectBySlug(projectSlug as string);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check if user has access to project
      const member = await storage.getProjectMember(project.id, req.user!.id);
      if (!member) {
        return res.status(403).json({ message: "Access denied to this project" });
      }

      const prompt = await storage.getPromptBySlug(project.id, slug);
      if (!prompt) {
        return res.status(404).json({ message: "Prompt not found" });
      }

      let promptVersion;
      if (version) {
        const versions = await storage.getPromptVersions(prompt.id);
        promptVersion = versions.find(v => v.version === parseInt(version as string));
      } else {
        promptVersion = await storage.getLatestPromptVersion(prompt.id);
      }

      if (!promptVersion) {
        return res.status(404).json({ message: "Prompt version not found" });
      }

      res.json({
        slug: prompt.slug,
        title: prompt.title,
        category: prompt.category,
        version: promptVersion.version,
        content: promptVersion.content,
        message: promptVersion.message,
        author: promptVersion.author,
        createdAt: promptVersion.createdAt,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch prompt" });
    }
  });

  app.get("/api/prompts/:slug/versions", authenticateSession, async (req: AuthenticatedRequest, res) => {
    try {
      const { slug } = req.params;
      const { projectSlug } = req.query;

      if (!projectSlug) {
        return res.status(400).json({ message: "Project slug required" });
      }

      const project = await storage.getProjectBySlug(projectSlug as string);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      const member = await storage.getProjectMember(project.id, req.user!.id);
      if (!member) {
        return res.status(403).json({ message: "Access denied to this project" });
      }

      const prompt = await storage.getPromptBySlug(project.id, slug);
      if (!prompt) {
        return res.status(404).json({ message: "Prompt not found" });
      }

      const versions = await storage.getPromptVersions(prompt.id);
      res.json(versions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch prompt versions" });
    }
  });

  // API key routes
  app.get("/api/api-keys", authenticateSession, async (req: AuthenticatedRequest, res) => {
    try {
      const apiKeys = await storage.getUserApiKeys(req.user!.id);
      
      // Mask the keys for security
      const maskedKeys = apiKeys.map(key => ({
        ...key,
        keyHash: undefined,
        maskedKey: `${key.keyPrefix}•••••••••••••••••••••••••••••••••••••••••••`,
      }));

      res.json(maskedKeys);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch API keys" });
    }
  });

  app.post("/api/api-keys", authenticateSession, async (req: AuthenticatedRequest, res) => {
    try {
      const data = req.body;
      
      // Generate API key
      const keyValue = `pk_${crypto.randomBytes(32).toString("hex")}`;
      const keyHash = crypto.createHash("sha256").update(keyValue).digest("hex");
      const keyPrefix = keyValue.substring(0, 12);

      const apiKey = await storage.createApiKey({
        name: data.name,
        description: data.description,
        userId: req.user!.id,
        keyHash,
        keyPrefix,
      });

      // Return the full key only once
      res.json({
        ...apiKey,
        keyValue, // This is returned only once
        keyHash: undefined,
      });
    } catch (error) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.delete("/api/api-keys/:keyId", authenticateSession, async (req: AuthenticatedRequest, res) => {
    try {
      const keyId = parseInt(req.params.keyId);
      const apiKey = await storage.getApiKey(keyId);
      
      if (!apiKey || apiKey.userId !== req.user!.id) {
        return res.status(404).json({ message: "API key not found" });
      }

      await storage.deleteApiKey(keyId);
      res.json({ message: "API key deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete API key" });
    }
  });

  // Project members routes
  app.get("/api/projects/:projectId/members", authenticateSession, async (req: AuthenticatedRequest, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      // Check if user has access to project
      const member = await storage.getProjectMember(projectId, req.user!.id);
      if (!member) {
        return res.status(403).json({ message: "Access denied to this project" });
      }

      const members = await storage.getProjectMembers(projectId);
      res.json(members);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch project members" });
    }
  });

  app.post("/api/projects/:projectId/members", authenticateSession, async (req: AuthenticatedRequest, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      // Check if user is admin of the project
      const member = await storage.getProjectMember(projectId, req.user!.id);
      if (!member || member.role !== "admin") {
        return res.status(403).json({ message: "Only project admins can invite members" });
      }

      const { email, role } = req.body;

      // Find user by email
      const targetUser = await storage.getUserByEmail(email);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check if user is already a member
      const existingMember = await storage.getProjectMember(projectId, targetUser.id);
      if (existingMember) {
        return res.status(400).json({ message: "User is already a member of this project" });
      }

      const newMember = await storage.addProjectMember({
        projectId,
        userId: targetUser.id,
        role,
      });

      res.json(newMember);
    } catch (error) {
      res.status(500).json({ message: "Failed to invite member" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
