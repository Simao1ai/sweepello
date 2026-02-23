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
  serviceType: text("service_type").notNull().default("standard"),
  bedrooms: integer("bedrooms"),
  bathrooms: integer("bathrooms"),
  basement: boolean("basement").default(false),
  requestedDate: timestamp("requested_date").notNull(),
  preferredTime: text("preferred_time"),
  specialInstructions: text("special_instructions"),
  status: text("status").notNull().default("pending"),
  estimatedPrice: decimal("estimated_price", { precision: 10, scale: 2 }),
  subcontractorCost: decimal("subcontractor_cost", { precision: 10, scale: 2 }),
  assignedCleanerId: varchar("assigned_cleaner_id"),
  preferredCleanerId: varchar("preferred_cleaner_id"),
  jobId: varchar("job_id"),
  squareFootage: integer("square_footage"),
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

export const jobOffers = pgTable("job_offers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  serviceRequestId: varchar("service_request_id").notNull(),
  cleanerId: varchar("cleaner_id").notNull(),
  status: text("status").notNull().default("offered"),
  priorityRank: integer("priority_rank").notNull().default(0),
  offeredAt: timestamp("offered_at").defaultNow(),
  respondedAt: timestamp("responded_at"),
  expiresAt: timestamp("expires_at"),
});

export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull().default("job_assigned"),
  jobId: varchar("job_id"),
  serviceRequestId: varchar("service_request_id"),
  jobOfferId: varchar("job_offer_id"),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const contractorOnboarding = pgTable("contractor_onboarding", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique(),
  fullName: text("full_name").notNull(),
  businessName: text("business_name"),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  address: text("address").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull().default("NJ"),
  zipCode: text("zip_code").notNull(),
  serviceZipCodes: text("service_zip_codes"),
  w9Signed: boolean("w9_signed").notNull().default(false),
  w9SignedAt: timestamp("w9_signed_at"),
  w9SignatureName: text("w9_signature_name"),
  insuranceProvider: text("insurance_provider"),
  insurancePolicyNumber: text("insurance_policy_number"),
  insuranceExpirationDate: text("insurance_expiration_date"),
  hasInsurance: boolean("has_insurance").notNull().default(false),
  stripeAccountId: text("stripe_account_id"),
  stripeOnboardingComplete: boolean("stripe_onboarding_complete").notNull().default(false),
  onboardingStatus: text("onboarding_status").notNull().default("incomplete"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertContractorOnboardingSchema = createInsertSchema(contractorOnboarding).omit({ id: true, createdAt: true, updatedAt: true, stripeAccountId: true, stripeOnboardingComplete: true, onboardingStatus: true });
export type ContractorOnboarding = typeof contractorOnboarding.$inferSelect;
export type InsertContractorOnboarding = z.infer<typeof insertContractorOnboardingSchema>;

export const insertUserProfileSchema = createInsertSchema(userProfiles).omit({ id: true, createdAt: true });
export const insertClientSchema = createInsertSchema(clients).omit({ id: true });
export const insertCleanerSchema = createInsertSchema(cleaners).omit({ id: true, totalJobs: true, totalRevenue: true });
export const insertJobSchema = createInsertSchema(jobs).omit({ id: true, profit: true });
export const insertPaymentSchema = createInsertSchema(payments).omit({ id: true });
export const insertReviewSchema = createInsertSchema(reviews).omit({ id: true, createdAt: true });
export const insertServiceRequestSchema = createInsertSchema(serviceRequests).omit({ id: true, createdAt: true, jobId: true, assignedCleanerId: true, estimatedPrice: true, subcontractorCost: true });
export const insertCleanerAvailabilitySchema = createInsertSchema(cleanerAvailability).omit({ id: true });
export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true, isRead: true });
export const insertJobOfferSchema = createInsertSchema(jobOffers).omit({ id: true, offeredAt: true, respondedAt: true });

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
export type JobOffer = typeof jobOffers.$inferSelect;
export type InsertJobOffer = z.infer<typeof insertJobOfferSchema>;
