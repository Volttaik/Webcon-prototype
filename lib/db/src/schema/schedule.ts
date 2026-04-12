import { boolean, integer, pgTable, serial, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { agentsTable } from "./agents";

export const scheduleSessionsTable = pgTable("schedule_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  agentId: integer("agent_id").references(() => agentsTable.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  subject: text("subject"),
  date: text("date").notNull(),
  duration: integer("duration").notNull().default(60),
  type: text("type").notNull().default("study"),
  completed: boolean("completed").notNull().default(false),
  notes: text("notes"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const insertScheduleSessionSchema = createInsertSchema(scheduleSessionsTable).omit({
  id: true,
  createdAt: true,
});

export type ScheduleSession = typeof scheduleSessionsTable.$inferSelect;
export type InsertScheduleSession = z.infer<typeof insertScheduleSessionSchema>;
