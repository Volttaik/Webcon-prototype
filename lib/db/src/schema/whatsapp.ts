import { boolean, integer, pgTable, serial, text, char } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { agentsTable } from "./agents";

export const whatsappLinksTable = pgTable("whatsapp_links", {
  userId: integer("user_id").primaryKey().references(() => usersTable.id, { onDelete: "cascade" }),
  initCode: text("init_code").notNull().unique(),
  connected: boolean("connected").notNull().default(false),
  phoneNumber: text("phone_number"),
  connectedAt: text("connected_at"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const whatsappAgentCodesTable = pgTable("whatsapp_agent_codes", {
  id: serial("id").primaryKey(),
  code: char("code", { length: 12 }).notNull().unique(),
  agentId: integer("agent_id").notNull().references(() => agentsTable.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  used: boolean("used").notNull().default(false),
  phoneNumber: text("phone_number"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  usedAt: text("used_at"),
});

export const whatsappSessionsTable = pgTable("whatsapp_sessions", {
  phoneNumber: text("phone_number").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id, { onDelete: "cascade" }),
  activeAgentId: integer("active_agent_id").references(() => agentsTable.id, { onDelete: "set null" }),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const whatsappAuthTable = pgTable("whatsapp_auth", {
  id: text("id").primaryKey(),
  data: text("data").notNull(),
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export type WhatsappLink        = typeof whatsappLinksTable.$inferSelect;
export type WhatsappAgentCode   = typeof whatsappAgentCodesTable.$inferSelect;
export type WhatsappSession     = typeof whatsappSessionsTable.$inferSelect;
export type WhatsappAuth        = typeof whatsappAuthTable.$inferSelect;
