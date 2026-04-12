import { boolean, integer, pgTable, serial, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const learningHubsTable = pgTable("learning_hubs", {
  id: serial("id").primaryKey(),
  creatorId: integer("creator_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  domain: text("domain").notNull().default("general"),
  accessCost: integer("access_cost").notNull().default(200),
  agentCost: integer("agent_cost").notNull().default(700),
  isPublic: boolean("is_public").notNull().default(true),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()).$onUpdateFn(() => new Date().toISOString()),
});

export const hubFilesTable = pgTable("hub_files", {
  id: serial("id").primaryKey(),
  hubId: integer("hub_id").notNull().references(() => learningHubsTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  content: text("content").notNull(),
  fileType: text("file_type").notNull().default("text"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const insertLearningHubSchema = createInsertSchema(learningHubsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type LearningHub = typeof learningHubsTable.$inferSelect;
export type HubFile = typeof hubFilesTable.$inferSelect;
export type InsertLearningHub = z.infer<typeof insertLearningHubSchema>;
