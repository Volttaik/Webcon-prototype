import { integer, pgTable, serial, text } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const creditTransfersTable = pgTable("credit_transfers", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  recipientId: integer("recipient_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  recipientEmail: text("recipient_email").notNull(),
  amount: integer("amount").notNull(),
  note: text("note"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export type CreditTransfer = typeof creditTransfersTable.$inferSelect;
