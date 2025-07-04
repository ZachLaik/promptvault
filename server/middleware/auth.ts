import { Request, Response, NextFunction } from "express";
import { storage } from "../storage";
import bcrypt from "bcrypt";
import crypto from "crypto";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    username: string;
    email: string;
  };
}

export async function authenticateSession(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    req.user = {
      id: user.id,
      username: user.username,
      email: user.email,
    };

    next();
  } catch (error) {
    res.status(500).json({ message: "Authentication error" });
  }
}

export async function authenticateApiKey(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const apiKey = req.headers["x-api-key"] as string;
    if (!apiKey) {
      return res.status(401).json({ message: "API key required" });
    }

    // Hash the provided key to compare with stored hash
    const keyHash = crypto.createHash("sha256").update(apiKey).digest("hex");
    const apiKeyRecord = await storage.getApiKeyByHash(keyHash);
    
    if (!apiKeyRecord || !apiKeyRecord.isActive) {
      return res.status(401).json({ message: "Invalid or inactive API key" });
    }

    // Update last used timestamp
    await storage.updateApiKey(apiKeyRecord.id, { lastUsedAt: new Date() });

    const user = await storage.getUser(apiKeyRecord.userId);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    req.user = {
      id: user.id,
      username: user.username,
      email: user.email,
    };

    next();
  } catch (error) {
    res.status(500).json({ message: "Authentication error" });
  }
}

export async function checkProjectAccess(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
  requiredRole: "viewer" | "editor" | "admin" = "viewer"
) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const projectId = parseInt(req.params.projectId);
    if (isNaN(projectId)) {
      return res.status(400).json({ message: "Invalid project ID" });
    }

    const member = await storage.getProjectMember(projectId, req.user.id);
    if (!member) {
      return res.status(403).json({ message: "Access denied to this project" });
    }

    // Check role hierarchy: admin > editor > viewer
    const roleHierarchy = { viewer: 0, editor: 1, admin: 2 };
    const userRole = roleHierarchy[member.role as keyof typeof roleHierarchy];
    const requiredRoleLevel = roleHierarchy[requiredRole];

    if (userRole < requiredRoleLevel) {
      return res.status(403).json({ message: `Requires ${requiredRole} role or higher` });
    }

    next();
  } catch (error) {
    res.status(500).json({ message: "Authorization error" });
  }
}
