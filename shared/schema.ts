import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, timestamp, boolean, date, time } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export * from "./models/auth";

export const userProfiles = pgTable("user_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique(),
  role: text("role").notNull().default("client"),
  phone: text("phone"),
  address: text("address"),
  city: text("city"),
  zipCode: text("zip_code"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const clients = pgTable("clients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id"),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  propertyAddress: text("property_address").notNull(),
  propertyType: text("property_type").notNull().default("airbnb"),
  city: text("city"),
  zipCode: text("zip_code"),
  bedrooms: integer("bedrooms"),
  bathrooms: integer("bathrooms"),
  notes: text("notes"),
});

export const cleaners = pgTable("cleaners", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id"),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone").notNull(),
  payRate: integer("pay_rate").notNull().default(70),
  status: text("status").notNull().default("active"),
  rating: decimal("rating", { precision: 3, scale: 2 }).default("5.00"),
  onTimePercent: integer("on_time_percent").default(100),
  totalJobs: integer("total_jobs").default(0),
  totalRevenue: decimal("total_revenue", { precision: 10, scale: 2 }).default("0.00"),
  serviceArea: text("service_area"),
  zipCodes: text("zip_codes"),
});

export const cleanerAvailability = pgTable("cleaner_availability", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  cleanerId: varchar("cleaner_id").notNull(),
  dayOfWeek: integer("day_of_week").notNull(),
  startTime: text("start_time").notNull().default("08:00"),
  endTime: text("end_time").notNull().default("18:00"),
  isAvailable: boolean("is_available").notNull().default(true),
});

export const serviceRequests = pgTable("service_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  propertyAddress: text("property_address").notNull(),
  city: text("city"),
  zipCode: text("zip_code"),
  propertyType: text("property_type").notNull().default("airbnb"),
  bedrooms: integer("bedrooms"),
  bathrooms: integer("bathrooms"),
  requestedDate: timestamp("requested_date").notNull(),
  preferredTime: text("preferred_time"),
  specialInstructions: text("special_instructions"),
  status: text("status").notNull().default("pending"),
  estimatedPrice: decimal("estimated_price", { precision: 10, scale: 2 }),
  assignedCleanerId: varchar("assigned_cleaner_id"),
  jobId: varchar("job_id"),
  createdAt: timestamp("created_at").defaultNow(),
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
  serviceRequestId: varchar("service_request_id"),
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
  userId: varchar("user_id"),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull().default("job_assigned"),
  jobId: varchar("job_id"),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserProfileSchema = createInsertSchema(userProfiles).omit({ id: true, createdAt: true });
export const insertClientSchema = createInsertSchema(clients).omit({ id: true });
export const insertCleanerSchema = createInsertSchema(cleaners).omit({ id: true, totalJobs: true, totalRevenue: true });
export const insertJobSchema = createInsertSchema(jobs).omit({ id: true, profit: true });
export const insertPaymentSchema = createInsertSchema(payments).omit({ id: true });
export const insertReviewSchema = createInsertSchema(reviews).omit({ id: true, createdAt: true });
export const insertServiceRequestSchema = createInsertSchema(serviceRequests).omit({ id: true, createdAt: true, jobId: true, assignedCleanerId: true, estimatedPrice: true });
export const insertCleanerAvailabilitySchema = createInsertSchema(cleanerAvailability).omit({ id: true });
export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true, isRead: true });

export type UserProfile = typeof userProfiles.$inferSelect;
export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;
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
export type ServiceRequest = typeof serviceRequests.$inferSelect;
export type InsertServiceRequest = z.infer<typeof insertServiceRequestSchema>;
export type CleanerAvailability = typeof cleanerAvailability.$inferSelect;
export type InsertCleanerAvailability = z.infer<typeof insertCleanerAvailabilitySchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
