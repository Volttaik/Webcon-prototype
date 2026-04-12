import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { agentsTable } from "./agents";

export const projectsTable = sqliteTable("projects", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  agentId: integer("agent_id").references(() => agentsTable.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  subject: text("subject"),
  type: text("type").notNull().default("general"),
  status: text("status").notNull().default("active"),
  dueDate: text("due_date"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const projectTasksTable = sqliteTable("project_tasks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  completed: integer("completed", { mode: "boolean" }).notNull().default(false),
  dueDate: text("due_date"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const insertProjectSchema = createInsertSchema(projectsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProjectTaskSchema = createInsertSchema(projectTasksTable).omit({
  id: true,
  createdAt: true,
});

export type Project = typeof projectsTable.$inferSelect;
export type ProjectTask = typeof projectTasksTable.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type InsertProjectTask = z.infer<typeof insertProjectTaskSchema>;
