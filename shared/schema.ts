import { pgTable, text, serial, integer, boolean, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password"),
  githubId: text("github_id"),
  githubAccessToken: text("github_access_token"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  slug: text("slug").notNull().unique(),
  ownerId: integer("owner_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const projectMembers = pgTable("project_members", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id),
  userId: integer("user_id").notNull().references(() => users.id),
  role: text("role").notNull().default("viewer"), // admin, editor, viewer
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
});

export const prompts = pgTable("prompts", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull(),
  title: text("title").notNull(),
  category: text("category").notNull().default("general"),
  projectId: integer("project_id").notNull().references(() => projects.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const promptVersions = pgTable("prompt_versions", {
  id: serial("id").primaryKey(),
  promptId: integer("prompt_id").notNull().references(() => prompts.id),
  version: integer("version").notNull(),
  content: text("content").notNull(),
  message: text("message"),
  authorId: integer("author_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const apiKeys = pgTable("api_keys", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  description: text("description"),
  keyHash: text("key_hash").notNull(),
  keyPrefix: text("key_prefix").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  lastUsedAt: timestamp("last_used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// User's stored OpenRouter API keys (encrypted)
export const userOpenRouterKeys = pgTable("user_openrouter_keys", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  encryptedKey: text("encrypted_key").notNull(),
  keyPrefix: text("key_prefix").notNull(), // First 8 chars for display
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Optimization datasets - reusable Q&A examples for prompts
export const optimizationDatasets = pgTable("optimization_datasets", {
  id: serial("id").primaryKey(),
  promptId: integer("prompt_id").notNull().references(() => prompts.id),
  name: text("name").notNull(),
  description: text("description"),
  examples: text("examples").notNull(), // JSON array of {question, answer}
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Prompt Optimization runs - stores DSPy optimization history
export const promptOptimizations = pgTable("prompt_optimizations", {
  id: serial("id").primaryKey(),
  promptId: integer("prompt_id").notNull().references(() => prompts.id),
  promptVersionId: integer("prompt_version_id").references(() => promptVersions.id),
  originalContent: text("original_content").notNull(),
  optimizedContent: text("optimized_content"),
  qaExamples: text("qa_examples").notNull(), // JSON string of [{question, answer}]
  settings: text("settings").notNull(), // JSON string of optimization settings
  status: text("status").notNull().default("pending"), // pending, running, completed, failed
  baselineScore: text("baseline_score"), // Store as text to handle decimals
  optimizedScore: text("optimized_score"),
  iterations: text("iterations"), // JSON string of iteration details
  errorMessage: text("error_message"),
  authorId: integer("author_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  email: true,
  password: true,
  githubId: true,
  githubAccessToken: true,
});

export const insertProjectSchema = createInsertSchema(projects).pick({
  name: true,
  description: true,
  slug: true,
  ownerId: true,
});

export const insertProjectMemberSchema = createInsertSchema(projectMembers).pick({
  projectId: true,
  userId: true,
  role: true,
});

export const insertPromptSchema = createInsertSchema(prompts).pick({
  slug: true,
  title: true,
  category: true,
  projectId: true,
});

export const insertPromptVersionSchema = createInsertSchema(promptVersions).pick({
  promptId: true,
  version: true,
  content: true,
  message: true,
  authorId: true,
});

export const insertApiKeySchema = createInsertSchema(apiKeys).pick({
  userId: true,
  name: true,
  description: true,
  keyHash: true,
  keyPrefix: true,
});

export const insertUserOpenRouterKeySchema = createInsertSchema(userOpenRouterKeys).pick({
  userId: true,
  name: true,
  encryptedKey: true,
  keyPrefix: true,
  isDefault: true,
});

export const insertOptimizationDatasetSchema = createInsertSchema(optimizationDatasets).pick({
  promptId: true,
  name: true,
  description: true,
  examples: true,
});

export const insertPromptOptimizationSchema = createInsertSchema(promptOptimizations).pick({
  promptId: true,
  promptVersionId: true,
  originalContent: true,
  optimizedContent: true,
  qaExamples: true,
  settings: true,
  status: true,
  baselineScore: true,
  optimizedScore: true,
  iterations: true,
  errorMessage: true,
  authorId: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;

export type ProjectMember = typeof projectMembers.$inferSelect;
export type InsertProjectMember = z.infer<typeof insertProjectMemberSchema>;

export type Prompt = typeof prompts.$inferSelect;
export type InsertPrompt = z.infer<typeof insertPromptSchema>;

export type PromptVersion = typeof promptVersions.$inferSelect;
export type InsertPromptVersion = z.infer<typeof insertPromptVersionSchema>;

export type ApiKey = typeof apiKeys.$inferSelect;
export type InsertApiKey = z.infer<typeof insertApiKeySchema>;

export type UserOpenRouterKey = typeof userOpenRouterKeys.$inferSelect;
export type InsertUserOpenRouterKey = z.infer<typeof insertUserOpenRouterKeySchema>;

export type OptimizationDataset = typeof optimizationDatasets.$inferSelect;
export type InsertOptimizationDataset = z.infer<typeof insertOptimizationDatasetSchema>;

export type PromptOptimization = typeof promptOptimizations.$inferSelect;
export type InsertPromptOptimization = z.infer<typeof insertPromptOptimizationSchema>;

// Optimization-specific types
export const optimizationSettingsSchema = z.object({
  model: z.string(),
  judgeModel: z.string().optional(),
  optimizer: z.enum(["bootstrap", "bootstrap_random", "mipro", "copro"]),
  metric: z.enum(["exact", "contains", "semantic", "combined", "llm_judge", "llm_judge_strict"]),
  threshold: z.number().min(0).max(1).optional(),
  maxIterations: z.number().min(1).max(10).optional(),
  trials: z.number().min(1).max(50).optional(),
  demos: z.number().min(1).max(10).optional(),
});

export const qaExampleSchema = z.object({
  question: z.string().min(1),
  answer: z.string().min(1),
});

export const optimizationIterationSchema = z.object({
  iteration: z.number(),
  baselineScore: z.number(),
  optimizedScore: z.number(),
  improvement: z.number(),
  judgeRemarks: z.array(z.object({
    question: z.string(),
    expectedAnswer: z.string(),
    predictedAnswer: z.string(),
    score: z.number(),
    reasoning: z.string().optional(),
  })).optional(),
  candidatePrompt: z.string().optional(), // The prompt variant tested in this iteration
  timestamp: z.string(),
});

export type OptimizationSettings = z.infer<typeof optimizationSettingsSchema>;
export type QAExample = z.infer<typeof qaExampleSchema>;
export type OptimizationIteration = z.infer<typeof optimizationIterationSchema>;

// Auth schemas
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const signupSchema = insertUserSchema.extend({
  password: z.string().min(6),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
  confirmPassword: z.string().min(1, "Please confirm your new password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export type LoginData = z.infer<typeof loginSchema>;
export type SignupData = z.infer<typeof signupSchema>;
export type ChangePasswordData = z.infer<typeof changePasswordSchema>;