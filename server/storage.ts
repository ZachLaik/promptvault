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
  promptOptimizations,
  userOpenRouterKeys,
  optimizationDatasets,
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
  type PromptOptimization,
  type InsertPromptOptimization,
  type UserOpenRouterKey,
  type InsertUserOpenRouterKey,
  type OptimizationDataset,
  type InsertOptimizationDataset,
} from "@shared/schema";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserPassword(userId: number, hashedPassword: string): Promise<void>;

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

  // Prompt Optimizations
  getPromptOptimization(id: number): Promise<PromptOptimization | undefined>;
  getPromptOptimizations(promptId: number): Promise<(PromptOptimization & { author: User })[]>;
  createPromptOptimization(optimization: InsertPromptOptimization): Promise<PromptOptimization>;
  updatePromptOptimization(id: number, updates: Partial<PromptOptimization>): Promise<PromptOptimization | undefined>;

  // User OpenRouter Keys
  getUserOpenRouterKeys(userId: number): Promise<UserOpenRouterKey[]>;
  getUserOpenRouterKey(id: number): Promise<UserOpenRouterKey | undefined>;
  createUserOpenRouterKey(key: InsertUserOpenRouterKey): Promise<UserOpenRouterKey>;
  deleteUserOpenRouterKey(id: number): Promise<void>;
  setDefaultOpenRouterKey(userId: number, keyId: number): Promise<void>;

  // Optimization Datasets
  getOptimizationDatasets(promptId: number): Promise<OptimizationDataset[]>;
  getOptimizationDataset(id: number): Promise<OptimizationDataset | undefined>;
  createOptimizationDataset(dataset: InsertOptimizationDataset): Promise<OptimizationDataset>;
  updateOptimizationDataset(id: number, updates: Partial<OptimizationDataset>): Promise<OptimizationDataset | undefined>;
  deleteOptimizationDataset(id: number): Promise<void>;
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

  async createUser(userData: typeof users.$inferInsert) {
    const [user] = await this.db.insert(users).values(userData).returning();
    return user;
  }

  async getUserByGithubId(githubId: string) {
    const [user] = await this.db.select().from(users).where(eq(users.githubId, githubId));
    return user;
  }

  async updateUserGithubInfo(userId: number, githubId: string, accessToken: string) {
    await this.db.update(users).set({
      githubId,
      githubAccessToken: accessToken
    }).where(eq(users.id, userId));
  }

  async updateUserPassword(userId: number, hashedPassword: string): Promise<void> {
    await this.db.update(users).set({
      password: hashedPassword
    }).where(eq(users.id, userId));
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

  // Prompt Optimizations
  async getPromptOptimization(id: number): Promise<PromptOptimization | undefined> {
    const result = await this.db.select().from(promptOptimizations).where(eq(promptOptimizations.id, id)).limit(1);
    return result[0];
  }

  async getPromptOptimizations(promptId: number): Promise<(PromptOptimization & { author: User })[]> {
    const result = await this.db
      .select({
        id: promptOptimizations.id,
        promptId: promptOptimizations.promptId,
        promptVersionId: promptOptimizations.promptVersionId,
        originalContent: promptOptimizations.originalContent,
        optimizedContent: promptOptimizations.optimizedContent,
        qaExamples: promptOptimizations.qaExamples,
        settings: promptOptimizations.settings,
        status: promptOptimizations.status,
        baselineScore: promptOptimizations.baselineScore,
        optimizedScore: promptOptimizations.optimizedScore,
        iterations: promptOptimizations.iterations,
        errorMessage: promptOptimizations.errorMessage,
        authorId: promptOptimizations.authorId,
        createdAt: promptOptimizations.createdAt,
        completedAt: promptOptimizations.completedAt,
        author: users,
      })
      .from(promptOptimizations)
      .innerJoin(users, eq(users.id, promptOptimizations.authorId))
      .where(eq(promptOptimizations.promptId, promptId))
      .orderBy(desc(promptOptimizations.createdAt));

    return result;
  }

  async createPromptOptimization(optimization: InsertPromptOptimization): Promise<PromptOptimization> {
    const result = await this.db.insert(promptOptimizations).values(optimization).returning();
    return result[0];
  }

  async updatePromptOptimization(id: number, updates: Partial<PromptOptimization>): Promise<PromptOptimization | undefined> {
    const result = await this.db.update(promptOptimizations).set(updates).where(eq(promptOptimizations.id, id)).returning();
    return result[0];
  }

  // User OpenRouter Keys
  async getUserOpenRouterKeys(userId: number): Promise<UserOpenRouterKey[]> {
    const result = await this.db
      .select()
      .from(userOpenRouterKeys)
      .where(eq(userOpenRouterKeys.userId, userId))
      .orderBy(desc(userOpenRouterKeys.createdAt));
    return result;
  }

  async getUserOpenRouterKey(id: number): Promise<UserOpenRouterKey | undefined> {
    const result = await this.db.select().from(userOpenRouterKeys).where(eq(userOpenRouterKeys.id, id)).limit(1);
    return result[0];
  }

  async createUserOpenRouterKey(key: InsertUserOpenRouterKey): Promise<UserOpenRouterKey> {
    const result = await this.db.insert(userOpenRouterKeys).values(key).returning();
    return result[0];
  }

  async deleteUserOpenRouterKey(id: number): Promise<void> {
    await this.db.delete(userOpenRouterKeys).where(eq(userOpenRouterKeys.id, id));
  }

  async setDefaultOpenRouterKey(userId: number, keyId: number): Promise<void> {
    // First, unset all defaults for this user
    await this.db
      .update(userOpenRouterKeys)
      .set({ isDefault: false })
      .where(eq(userOpenRouterKeys.userId, userId));
    // Then set the specified key as default
    await this.db
      .update(userOpenRouterKeys)
      .set({ isDefault: true })
      .where(eq(userOpenRouterKeys.id, keyId));
  }

  // Optimization Datasets
  async getOptimizationDatasets(promptId: number): Promise<OptimizationDataset[]> {
    const result = await this.db
      .select()
      .from(optimizationDatasets)
      .where(eq(optimizationDatasets.promptId, promptId))
      .orderBy(desc(optimizationDatasets.updatedAt));
    return result;
  }

  async getOptimizationDataset(id: number): Promise<OptimizationDataset | undefined> {
    const result = await this.db.select().from(optimizationDatasets).where(eq(optimizationDatasets.id, id)).limit(1);
    return result[0];
  }

  async createOptimizationDataset(dataset: InsertOptimizationDataset): Promise<OptimizationDataset> {
    const result = await this.db.insert(optimizationDatasets).values(dataset).returning();
    return result[0];
  }

  async updateOptimizationDataset(id: number, updates: Partial<OptimizationDataset>): Promise<OptimizationDataset | undefined> {
    const result = await this.db
      .update(optimizationDatasets)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(optimizationDatasets.id, id))
      .returning();
    return result[0];
  }

  async deleteOptimizationDataset(id: number): Promise<void> {
    await this.db.delete(optimizationDatasets).where(eq(optimizationDatasets.id, id));
  }
}

export const storage = new DatabaseStorage();