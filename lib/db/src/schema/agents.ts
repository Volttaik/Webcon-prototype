import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const agentsTable = sqliteTable("agents", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  subject: text("subject").notNull(),
  level: text("level").notNull(),
  tone: text("tone").notNull().default("patient"),
  domain: text("domain").notNull().default("general"),
  personalityDescription: text("personality_description"),
  soulMd: text("soul_md"),
  systemPrompt: text("system_prompt"),
  learningHubId: integer("learning_hub_id"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()).$onUpdateFn(() => new Date().toISOString()),
});

export const agentMemoryTable = sqliteTable("agent_memory", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  agentId: integer("agent_id").notNull().references(() => agentsTable.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  memoryType: text("memory_type").notNull().default("long_term"),
  content: text("content").notNull(),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()).$onUpdateFn(() => new Date().toISOString()),
});

export const agentSubscriptionsTable = sqliteTable("agent_subscriptions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  agentId: integer("agent_id").notNull().references(() => agentsTable.id, { onDelete: "cascade" }),
  creditsCost: integer("credits_cost").notNull().default(100),
  expiresAt: text("expires_at").notNull(),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const insertAgentSchema = createInsertSchema(agentsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Agent = typeof agentsTable.$inferSelect;
export type InsertAgent = z.infer<typeof insertAgentSchema>;
export type AgentMemory = typeof agentMemoryTable.$inferSelect;
export type AgentSubscription = typeof agentSubscriptionsTable.$inferSelect;
