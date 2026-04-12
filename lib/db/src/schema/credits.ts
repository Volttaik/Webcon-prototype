import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const creditBalancesTable = sqliteTable("credit_balances", {
  userId: integer("user_id").primaryKey().references(() => usersTable.id, { onDelete: "cascade" }),
  balance: integer("balance").notNull().default(0),
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const creditTransactionsTable = sqliteTable("credit_transactions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  amount: integer("amount").notNull(),
  type: text("type").notNull(),
  description: text("description").notNull(),
  reference: text("reference"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const insertCreditTransactionSchema = createInsertSchema(creditTransactionsTable).omit({
  id: true,
  createdAt: true,
});

export type CreditBalance = typeof creditBalancesTable.$inferSelect;
export type CreditTransaction = typeof creditTransactionsTable.$inferSelect;
export type InsertCreditTransaction = z.infer<typeof insertCreditTransactionSchema>;
