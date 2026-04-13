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
  accessCost: integer("access_cost").notNull().default(50),
  agentCost: integer("agent_cost").notNull().default(200),
  isPublic: boolean("is_public").notNull().default(true),
  status: text("status").notNull().default("pending"),
  accessToken: text("access_token"),
  subscriberCount: integer("subscriber_count").notNull().default(0),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()).$onUpdateFn(() => new Date().toISOString()),
});

export const hubFilesTable = pgTable("hub_files", {
  id: serial("id").primaryKey(),
  hubId: integer("hub_id").notNull().references(() => learningHubsTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  content: text("content").notNull(),
  fileType: text("file_type").notNull().default("text"),
  wordCount: integer("word_count").notNull().default(0),
  qualityScore: integer("quality_score").notNull().default(0),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const hubApplicationsTable = pgTable("hub_applications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  fullName: text("full_name").notNull(),
  gender: text("gender").notNull(),
  dateOfBirth: text("date_of_birth").notNull(),
  gmailAddress: text("gmail_address").notNull(),
  state: text("state").notNull(),
  university: text("university").notNull(),
  degreeStatus: text("degree_status").notNull(),
  nin: text("nin").notNull(),
  fieldOfStudy: text("field_of_study").notNull(),
  expertiseLevel: text("expertise_level").notNull(),
  targetLevel: text("target_level").notNull(),
  hubTitle: text("hub_title").notNull(),
  hubDescription: text("hub_description"),
  hubDomain: text("hub_domain").notNull().default("general"),
  passportPhotoUrl: text("passport_photo_url"),
  degreeEvidenceUrl: text("degree_evidence_url"),
  studentEvidenceUrl: text("student_evidence_url"),
  status: text("status").notNull().default("pending"),
  hubId: integer("hub_id").references(() => learningHubsTable.id),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  reviewedAt: text("reviewed_at"),
});

export const hubSubscriptionsTable = pgTable("hub_subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  hubId: integer("hub_id").notNull().references(() => learningHubsTable.id, { onDelete: "cascade" }),
  active: boolean("active").notNull().default(true),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const creatorEarningsTable = pgTable("creator_earnings", {
  id: serial("id").primaryKey(),
  creatorId: integer("creator_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  hubId: integer("hub_id").references(() => learningHubsTable.id),
  type: text("type").notNull(),
  amountNgn: integer("amount_ngn").notNull(),
  description: text("description").notNull(),
  paystackReference: text("paystack_reference"),
  transferStatus: text("transfer_status").notNull().default("pending"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const insertLearningHubSchema = createInsertSchema(learningHubsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type LearningHub = typeof learningHubsTable.$inferSelect;
export type HubFile = typeof hubFilesTable.$inferSelect;
export type HubApplication = typeof hubApplicationsTable.$inferSelect;
export type HubSubscription = typeof hubSubscriptionsTable.$inferSelect;
export type CreatorEarning = typeof creatorEarningsTable.$inferSelect;
export type InsertLearningHub = z.infer<typeof insertLearningHubSchema>;
