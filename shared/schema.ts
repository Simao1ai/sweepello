import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const clients = pgTable("clients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  propertyAddress: text("property_address").notNull(),
  propertyType: text("property_type").notNull().default("airbnb"),
  notes: text("notes"),
});

export const cleaners = pgTable("cleaners", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone").notNull(),
  payRate: integer("pay_rate").notNull().default(70),
  status: text("status").notNull().default("active"),
  rating: decimal("rating", { precision: 3, scale: 2 }).default("5.00"),
  onTimePercent: integer("on_time_percent").default(100),
  totalJobs: integer("total_jobs").default(0),
  totalRevenue: decimal("total_revenue", { precision: 10, scale: 2 }).default("0.00"),
});

export const jobs = pgTable("jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull(),
  cleanerId: varchar("cleaner_id"),
  propertyAddress: text("property_address").notNull(),
  scheduledDate: timestamp("scheduled_date").notNull(),
  status: text("status").notNull().default("pending"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  cleanerPay: decimal("cleaner_pay", { precision: 10, scale: 2 }),
  profit: decimal("profit", { precision: 10, scale: 2 }),
  notes: text("notes"),
});

export const payments = pgTable("payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobId: varchar("job_id").notNull(),
  cleanerId: varchar("cleaner_id"),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  type: text("type").notNull().default("incoming"),
  status: text("status").notNull().default("pending"),
  paidAt: timestamp("paid_at"),
});

export const reviews = pgTable("reviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobId: varchar("job_id").notNull(),
  clientId: varchar("client_id").notNull(),
  cleanerId: varchar("cleaner_id").notNull(),
  rating: integer("rating").notNull(),
  comment: text("comment"),
});

export const insertClientSchema = createInsertSchema(clients).omit({ id: true });
export const insertCleanerSchema = createInsertSchema(cleaners).omit({ id: true, totalJobs: true, totalRevenue: true });
export const insertJobSchema = createInsertSchema(jobs).omit({ id: true, profit: true });
export const insertPaymentSchema = createInsertSchema(payments).omit({ id: true });
export const insertReviewSchema = createInsertSchema(reviews).omit({ id: true });

export type Client = typeof clients.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Cleaner = typeof cleaners.$inferSelect;
export type InsertCleaner = z.infer<typeof insertCleanerSchema>;
export type Job = typeof jobs.$inferSelect;
export type InsertJob = z.infer<typeof insertJobSchema>;
export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Review = typeof reviews.$inferSelect;
export type InsertReview = z.infer<typeof insertReviewSchema>;
