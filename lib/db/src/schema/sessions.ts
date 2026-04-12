import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { usersTable } from "./users";

export const sessionsTable = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export type Session = typeof sessionsTable.$inferSelect;
