import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { agentsTable } from "./agents";

export const workspaceItemsTable = sqliteTable("workspace_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  agentId: integer("agent_id").references(() => agentsTable.id, { onDelete: "set null" }),
  conversationId: integer("conversation_id"),
  type: text("type").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull().default(""),
  pinned: integer("pinned", { mode: "boolean" }).notNull().default(false),
  starred: integer("starred", { mode: "boolean" }).notNull().default(false),
  subject: text("subject"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const insertWorkspaceItemSchema = createInsertSchema(workspaceItemsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type WorkspaceItem = typeof workspaceItemsTable.$inferSelect;
export type InsertWorkspaceItem = z.infer<typeof insertWorkspaceItemSchema>;
