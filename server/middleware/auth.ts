import { Request, Response, NextFunction } from "express";
import { storage } from "../storage";
import bcrypt from "bcrypt";
import crypto from "crypto";
import passport from "passport";
import { Strategy as GitHubStrategy } from "passport-github2";
import { Strategy as LocalStrategy } from "passport-local";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    username: string;
    email: string;
    githubId?: string;
    githubAccessToken?: string;
  };
}

// Configure GitHub OAuth
passport.use(new GitHubStrategy({
  clientID: process.env.GITHUB_CLIENT_ID || '',
  clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
  callbackURL: process.env.GITHUB_CALLBACK_URL || 'https://prompting-manager.replit.app/api/auth/github/callback'
}, async (accessToken, refreshToken, profile, done) => {
  try {
    // Check if user exists with this GitHub ID
    let user = await storage.getUserByGithubId(profile.id);
    
    if (!user) {
      // Check if user exists with same email
      const email = profile.emails?.[0]?.value;
      if (email) {
        user = await storage.getUserByEmail(email);
        if (user) {
          // Link GitHub account to existing user
          await storage.updateUserGithubInfo(user.id, profile.id, accessToken);
          user = await storage.getUser(user.id); // Refresh user data
        }
      }
      
      if (!user) {
        // Create new user
        user = await storage.createUser({
          username: profile.username || profile.displayName || `github_${profile.id}`,
          email: email || `${profile.id}@github.local`,
          password: '', // No password for GitHub users
          githubId: profile.id,
          githubAccessToken: accessToken
        });
      }
    } else {
      // Update access token
      await storage.updateUserGithubInfo(user.id, profile.id, accessToken);
      user = await storage.getUser(user.id); // Refresh user data
    }
    
    return done(null, user);
  } catch (error) {
    console.error('GitHub OAuth error:', error);
    return done(error, null);
  }
}));

// Configure local strategy
passport.use(new LocalStrategy({
  usernameField: 'email'
}, async (email, password, done) => {
  try {
    const user = await storage.getUserByEmail(email);
    if (!user || !user.password) {
      return done(null, false);
    }
    
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return done(null, false);
    }
    
    return done(null, user);
  } catch (error) {
    return done(error, null);
  }
}));

passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: number, done) => {
  try {
    const user = await storage.getUser(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

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

export async function authenticateEither(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    // Try session authentication first
    if ((req.session as any)?.userId) {
      const user = await storage.getUser((req.session as any).userId);
      if (user) {
        req.user = {
          id: user.id,
          username: user.username,
          email: user.email,
        };
        return next();
      }
    }

    // Try API key authentication
    const apiKey = req.headers["x-api-key"] as string;
    if (apiKey) {
      const keyHash = crypto.createHash("sha256").update(apiKey).digest("hex");
      const apiKeyRecord = await storage.getApiKeyByHash(keyHash);
      
      if (apiKeyRecord && apiKeyRecord.isActive) {
        await storage.updateApiKey(apiKeyRecord.id, { lastUsedAt: new Date() });
        const user = await storage.getUser(apiKeyRecord.userId);
        
        if (user) {
          req.user = {
            id: user.id,
            username: user.username,
            email: user.email,
          };
          return next();
        }
      }
    }

    return res.status(401).json({ message: "Authentication required" });
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
