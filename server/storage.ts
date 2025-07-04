import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { eq, and, desc, sql } from "drizzle-orm";
import {
  users,
  projects,
  projectMembers,
  prompts,
  promptVersions,
  apiKeys,
  type User,
  type InsertUser,
  type Project,
  type InsertProject,
  type ProjectMember,
  type InsertProjectMember,
  type Prompt,
  type InsertPrompt,
  type PromptVersion,
  type InsertPromptVersion,
  type ApiKey,
  type InsertApiKey,
} from "@shared/schema";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Projects
  getProject(id: number): Promise<Project | undefined>;
  getProjectBySlug(slug: string): Promise<Project | undefined>;
  getProjectsForUser(userId: number): Promise<(Project & { role: string })[]>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: number, updates: Partial<Project>): Promise<Project | undefined>;

  // Project members
  getProjectMember(projectId: number, userId: number): Promise<ProjectMember | undefined>;
  getProjectMembers(projectId: number): Promise<(ProjectMember & { user: User })[]>;
  addProjectMember(member: InsertProjectMember): Promise<ProjectMember>;
  updateProjectMemberRole(projectId: number, userId: number, role: string): Promise<void>;
  removeProjectMember(projectId: number, userId: number): Promise<void>;

  // Prompts
  getPrompt(id: number): Promise<Prompt | undefined>;
  getPromptBySlug(projectId: number, slug: string): Promise<Prompt | undefined>;
  getProjectPrompts(projectId: number): Promise<Prompt[]>;
  createPrompt(prompt: InsertPrompt): Promise<Prompt>;
  updatePrompt(id: number, updates: Partial<Prompt>): Promise<Prompt | undefined>;
  deletePrompt(id: number): Promise<void>;

  // Prompt versions
  getPromptVersion(id: number): Promise<PromptVersion | undefined>;
  getPromptVersions(promptId: number): Promise<(PromptVersion & { author: User })[]>;
  getLatestPromptVersion(promptId: number): Promise<(PromptVersion & { author: User }) | undefined>;
  createPromptVersion(version: InsertPromptVersion): Promise<PromptVersion>;

  // API keys
  getApiKey(id: number): Promise<ApiKey | undefined>;
  getApiKeyByHash(keyHash: string): Promise<ApiKey | undefined>;
  getUserApiKeys(userId: number): Promise<ApiKey[]>;
  createApiKey(apiKey: InsertApiKey): Promise<ApiKey>;
  updateApiKey(id: number, updates: Partial<ApiKey>): Promise<ApiKey | undefined>;
  deleteApiKey(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  private db: ReturnType<typeof drizzle>;

  constructor() {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
    this.db = drizzle(pool);
  }

  // Users
  async getUser(id: number): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = await this.db.insert(users).values(user).returning();
    return result[0];
  }

  // Projects
  async getProject(id: number): Promise<Project | undefined> {
    const result = await this.db.select().from(projects).where(eq(projects.id, id)).limit(1);
    return result[0];
  }

  async getProjectBySlug(slug: string): Promise<Project | undefined> {
    const result = await this.db.select().from(projects).where(eq(projects.slug, slug)).limit(1);
    return result[0];
  }

  async getProjectsForUser(userId: number): Promise<(Project & { role: string })[]> {
    const result = await this.db
      .select({
        id: projects.id,
        name: projects.name,
        description: projects.description,
        slug: projects.slug,
        ownerId: projects.ownerId,
        createdAt: projects.createdAt,
        role: projectMembers.role,
      })
      .from(projects)
      .innerJoin(projectMembers, eq(projectMembers.projectId, projects.id))
      .where(eq(projectMembers.userId, userId))
      .orderBy(desc(projects.createdAt));
    
    return result;
  }

  async createProject(project: InsertProject): Promise<Project> {
    const result = await this.db.insert(projects).values(project).returning();
    return result[0];
  }

  async updateProject(id: number, updates: Partial<Project>): Promise<Project | undefined> {
    const result = await this.db.update(projects).set(updates).where(eq(projects.id, id)).returning();
    return result[0];
  }

  // Project members
  async getProjectMember(projectId: number, userId: number): Promise<ProjectMember | undefined> {
    const result = await this.db
      .select()
      .from(projectMembers)
      .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId)))
      .limit(1);
    return result[0];
  }

  async getProjectMembers(projectId: number): Promise<(ProjectMember & { user: User })[]> {
    const result = await this.db
      .select({
        id: projectMembers.id,
        projectId: projectMembers.projectId,
        userId: projectMembers.userId,
        role: projectMembers.role,
        joinedAt: projectMembers.joinedAt,
        user: users,
      })
      .from(projectMembers)
      .innerJoin(users, eq(users.id, projectMembers.userId))
      .where(eq(projectMembers.projectId, projectId));
    
    return result;
  }

  async addProjectMember(member: InsertProjectMember): Promise<ProjectMember> {
    const result = await this.db.insert(projectMembers).values(member).returning();
    return result[0];
  }

  async updateProjectMemberRole(projectId: number, userId: number, role: string): Promise<void> {
    await this.db
      .update(projectMembers)
      .set({ role })
      .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId)));
  }

  async removeProjectMember(projectId: number, userId: number): Promise<void> {
    await this.db
      .delete(projectMembers)
      .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId)));
  }

  // Prompts
  async getPrompt(id: number): Promise<Prompt | undefined> {
    const result = await this.db.select().from(prompts).where(eq(prompts.id, id)).limit(1);
    return result[0];
  }

  async getPromptBySlug(projectId: number, slug: string): Promise<Prompt | undefined> {
    const result = await this.db
      .select()
      .from(prompts)
      .where(and(eq(prompts.projectId, projectId), eq(prompts.slug, slug)))
      .limit(1);
    return result[0];
  }

  async getProjectPrompts(projectId: number): Promise<Prompt[]> {
    const result = await this.db
      .select()
      .from(prompts)
      .where(eq(prompts.projectId, projectId))
      .orderBy(desc(prompts.createdAt));
    return result;
  }

  async createPrompt(prompt: InsertPrompt): Promise<Prompt> {
    const result = await this.db.insert(prompts).values(prompt).returning();
    return result[0];
  }

  async updatePrompt(id: number, updates: Partial<Prompt>): Promise<Prompt | undefined> {
    const result = await this.db.update(prompts).set(updates).where(eq(prompts.id, id)).returning();
    return result[0];
  }

  async deletePrompt(id: number): Promise<void> {
    await this.db.delete(prompts).where(eq(prompts.id, id));
  }

  // Prompt versions
  async getPromptVersion(id: number): Promise<PromptVersion | undefined> {
    const result = await this.db.select().from(promptVersions).where(eq(promptVersions.id, id)).limit(1);
    return result[0];
  }

  async getPromptVersions(promptId: number): Promise<(PromptVersion & { author: User })[]> {
    const result = await this.db
      .select({
        id: promptVersions.id,
        promptId: promptVersions.promptId,
        version: promptVersions.version,
        content: promptVersions.content,
        message: promptVersions.message,
        authorId: promptVersions.authorId,
        createdAt: promptVersions.createdAt,
        author: users,
      })
      .from(promptVersions)
      .innerJoin(users, eq(users.id, promptVersions.authorId))
      .where(eq(promptVersions.promptId, promptId))
      .orderBy(desc(promptVersions.version));
    
    return result;
  }

  async getLatestPromptVersion(promptId: number): Promise<(PromptVersion & { author: User }) | undefined> {
    const result = await this.db
      .select({
        id: promptVersions.id,
        promptId: promptVersions.promptId,
        version: promptVersions.version,
        content: promptVersions.content,
        message: promptVersions.message,
        authorId: promptVersions.authorId,
        createdAt: promptVersions.createdAt,
        author: users,
      })
      .from(promptVersions)
      .innerJoin(users, eq(users.id, promptVersions.authorId))
      .where(eq(promptVersions.promptId, promptId))
      .orderBy(desc(promptVersions.version))
      .limit(1);
    
    return result[0];
  }

  async createPromptVersion(version: InsertPromptVersion): Promise<PromptVersion> {
    const result = await this.db.insert(promptVersions).values(version).returning();
    return result[0];
  }

  // API keys
  async getApiKey(id: number): Promise<ApiKey | undefined> {
    const result = await this.db.select().from(apiKeys).where(eq(apiKeys.id, id)).limit(1);
    return result[0];
  }

  async getApiKeyByHash(keyHash: string): Promise<ApiKey | undefined> {
    const result = await this.db.select().from(apiKeys).where(eq(apiKeys.keyHash, keyHash)).limit(1);
    return result[0];
  }

  async getUserApiKeys(userId: number): Promise<ApiKey[]> {
    const result = await this.db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.userId, userId))
      .orderBy(desc(apiKeys.createdAt));
    return result;
  }

  async createApiKey(apiKey: InsertApiKey): Promise<ApiKey> {
    const result = await this.db.insert(apiKeys).values(apiKey).returning();
    return result[0];
  }

  async updateApiKey(id: number, updates: Partial<ApiKey>): Promise<ApiKey | undefined> {
    const result = await this.db.update(apiKeys).set(updates).where(eq(apiKeys.id, id)).returning();
    return result[0];
  }

  async deleteApiKey(id: number): Promise<void> {
    await this.db.delete(apiKeys).where(eq(apiKeys.id, id));
  }
}

export const storage = new DatabaseStorage();
