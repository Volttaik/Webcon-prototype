import { boolean, integer, pgTable, text } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const whatsappLinksTable = pgTable("whatsapp_links", {
  userId: integer("user_id").primaryKey().references(() => usersTable.id, { onDelete: "cascade" }),
  initCode: text("init_code").notNull().unique(),
  connected: boolean("connected").notNull().default(false),
  phoneNumber: text("phone_number"),
  connectedAt: text("connected_at"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export type WhatsappLink = typeof whatsappLinksTable.$inferSelect;
