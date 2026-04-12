import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { usersTable } from "./users";

export const whatsappLinksTable = sqliteTable("whatsapp_links", {
  userId: integer("user_id").primaryKey().references(() => usersTable.id, { onDelete: "cascade" }),
  initCode: text("init_code").notNull().unique(),
  connected: integer("connected", { mode: "boolean" }).notNull().default(false),
  phoneNumber: text("phone_number"),
  connectedAt: text("connected_at"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export type WhatsappLink = typeof whatsappLinksTable.$inferSelect;
