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
  approvalStatus: text("approval_status"),
  stripeCustomerId: text("stripe_customer_id"),
  stripePaymentMethodId: text("stripe_payment_method_id"),
  stripeCardBrand: text("stripe_card_brand"),
  stripeCardLast4: text("stripe_card_last4"),
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
  isActive: boolean("is_active").notNull().default(true),
  isVip: boolean("is_vip").notNull().default(false),
  adminNote: text("admin_note"),
  clientRating: decimal("client_rating", { precision: 3, scale: 2 }),
  clientRatingCount: integer("client_rating_count").default(0),
});

export const cleaners = pgTable("cleaners", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id"),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone").notNull(),
  payRate: integer("pay_rate").notNull().default(70),
  status: text("status").notNull().default("active"),
  statusNote: text("status_note"),
  rating: decimal("rating", { precision: 3, scale: 2 }).default("5.00"),
  onTimePercent: integer("on_time_percent").default(100),
  totalJobs: integer("total_jobs").default(0),
  totalRevenue: decimal("total_revenue", { precision: 10, scale: 2 }).default("0.00"),
  serviceArea: text("service_area"),
  zipCodes: text("zip_codes"),
  isFeatured: boolean("is_featured").notNull().default(false),
  adminNote: text("admin_note"),
  isOnline: boolean("is_online").notNull().default(false),
  currentLat: decimal("current_lat", { precision: 10, scale: 7 }),
  currentLng: decimal("current_lng", { precision: 10, scale: 7 }),
  lastSeenAt: timestamp("last_seen_at"),
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
  isOnDemand: boolean("is_on_demand").notNull().default(false),
  surgeMultiplier: decimal("surge_multiplier", { precision: 4, scale: 2 }).default("1.00"),
  paymentStatus: text("payment_status").default("pending"),
  canceledAt: timestamp("canceled_at"),
  cancellationFeeCharged: boolean("cancellation_fee_charged").notNull().default(false),
  confirmedArrivalTime: text("confirmed_arrival_time"),
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
  clientRating: integer("client_rating"),
  clientRatingNote: text("client_rating_note"),
  // Tipping
  tipAmount: decimal("tip_amount", { precision: 10, scale: 2 }),
  tipStripeIntentId: text("tip_stripe_intent_id"),
  tipPaidAt: timestamp("tip_paid_at"),
});

export const payments = pgTable("payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobId: varchar("job_id").notNull(),
  cleanerId: varchar("cleaner_id"),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  type: text("type").notNull().default("incoming"),
  status: text("status").notNull().default("pending"),
  paidAt: timestamp("paid_at"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
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
  moderationStatus: text("moderation_status").notNull().default("approved"),
  adminNote: text("admin_note"),
  adminModifiedAt: timestamp("admin_modified_at"),
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
  agreementSigned: boolean("agreement_signed").notNull().default(false),
  agreementSignedAt: timestamp("agreement_signed_at"),
  agreementSignatureName: text("agreement_signature_name"),
  agreementDeclined: boolean("agreement_declined").notNull().default(false),
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

export const contractorApplications = pgTable("contractor_applications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  city: text("city").notNull(),
  zipCode: text("zip_code").notNull(),
  serviceZipCodes: text("service_zip_codes").notNull(),
  yearsExperience: integer("years_experience").notNull().default(0),
  cleaningTypes: text("cleaning_types").notNull(),
  isInsured: boolean("is_insured").notNull().default(false),
  hasOwnSupplies: boolean("has_own_supplies").notNull().default(false),
  references: text("references"),
  availableDays: text("available_days").notNull(),
  availableHours: text("available_hours").notNull(),
  agreementAcknowledged: boolean("agreement_acknowledged").notNull().default(false),
  status: text("status").notNull().default("pending"),
  adminNote: text("admin_note"),
  createdAt: timestamp("created_at").defaultNow(),
  reviewedAt: timestamp("reviewed_at"),
});

export const disputes = pgTable("disputes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  serviceRequestId: varchar("service_request_id"),
  jobId: varchar("job_id"),
  reportedByUserId: varchar("reported_by_user_id").notNull(),
  clientId: varchar("client_id"),
  cleanerId: varchar("cleaner_id"),
  title: text("title").notNull(),
  description: text("description").notNull(),
  status: text("status").notNull().default("open"),
  adminNote: text("admin_note"),
  resolutionNote: text("resolution_note"),
  createdAt: timestamp("created_at").defaultNow(),
  resolvedAt: timestamp("resolved_at"),
});

export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobId: varchar("job_id").notNull(),
  senderId: varchar("sender_id").notNull(),
  senderRole: text("sender_role").notNull(),
  senderName: text("sender_name").notNull(),
  content: text("content").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const aiUsageLogs = pgTable("ai_usage_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  createdAt: timestamp("created_at").defaultNow(),
  adminUserId: varchar("admin_user_id"),
  model: text("model").notNull().default("gpt-4o"),
  promptTokens: integer("prompt_tokens").notNull().default(0),
  completionTokens: integer("completion_tokens").notNull().default(0),
  totalTokens: integer("total_tokens").notNull().default(0),
  costUsd: decimal("cost_usd", { precision: 10, scale: 8 }).notNull().default("0"),
  rounds: integer("rounds").notNull().default(1),
  userMessage: text("user_message"),
});

export type AiUsageLog = typeof aiUsageLogs.$inferSelect;

export const insertContractorOnboardingSchema = createInsertSchema(contractorOnboarding).omit({ id: true, createdAt: true, updatedAt: true, stripeAccountId: true, stripeOnboardingComplete: true, onboardingStatus: true, agreementSigned: true, agreementSignedAt: true, agreementSignatureName: true, agreementDeclined: true });
export type ContractorOnboarding = typeof contractorOnboarding.$inferSelect;
export type InsertContractorOnboarding = z.infer<typeof insertContractorOnboardingSchema>;

export const insertContractorApplicationSchema = createInsertSchema(contractorApplications).omit({ id: true, createdAt: true, reviewedAt: true, status: true, adminNote: true });
export type ContractorApplication = typeof contractorApplications.$inferSelect;
export type InsertContractorApplication = z.infer<typeof insertContractorApplicationSchema>;

export const insertDisputeSchema = createInsertSchema(disputes).omit({ id: true, createdAt: true, resolvedAt: true, status: true, adminNote: true, resolutionNote: true });
export type Dispute = typeof disputes.$inferSelect;
export type InsertDispute = z.infer<typeof insertDisputeSchema>;

export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, createdAt: true, isRead: true });
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

// === RECURRING BOOKINGS ===
export const recurringBookings = pgTable("recurring_bookings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  propertyAddress: text("property_address").notNull(),
  city: text("city"),
  zipCode: text("zip_code"),
  serviceType: text("service_type").notNull().default("standard"),
  frequency: text("frequency").notNull(), // "weekly" | "biweekly" | "monthly"
  dayOfWeek: integer("day_of_week"), // 0=Sun … 6=Sat
  preferredTime: text("preferred_time"), // e.g. "09:00"
  bedrooms: integer("bedrooms").default(2),
  bathrooms: integer("bathrooms").default(1),
  squareFootage: integer("square_footage").default(1000),
  basement: boolean("basement").default(false),
  preferredCleanerId: varchar("preferred_cleaner_id"),
  specialInstructions: text("special_instructions"),
  isActive: boolean("is_active").notNull().default(true),
  nextServiceDate: timestamp("next_service_date"),
  lastServiceDate: timestamp("last_service_date"),
  estimatedPrice: text("estimated_price"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertRecurringBookingSchema = createInsertSchema(recurringBookings).omit({ id: true, createdAt: true, lastServiceDate: true, estimatedPrice: true });
export type RecurringBooking = typeof recurringBookings.$inferSelect;
export type InsertRecurringBooking = z.infer<typeof insertRecurringBookingSchema>;

// === JOB PHOTOS ===
export const jobPhotos = pgTable("job_photos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobId: varchar("job_id").notNull(),
  type: text("type").notNull(), // "before" | "after"
  url: text("url").notNull(),   // relative path served by /uploads
  uploadedByUserId: varchar("uploaded_by_user_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertJobPhotoSchema = createInsertSchema(jobPhotos).omit({ id: true, createdAt: true });
export type JobPhoto = typeof jobPhotos.$inferSelect;
export type InsertJobPhoto = z.infer<typeof insertJobPhotoSchema>;

export const insertUserProfileSchema = createInsertSchema(userProfiles).omit({ id: true, createdAt: true });
export const insertClientSchema = createInsertSchema(clients).omit({ id: true });
export const insertCleanerSchema = createInsertSchema(cleaners).omit({ id: true, totalJobs: true, totalRevenue: true });
export const insertJobSchema = createInsertSchema(jobs).omit({ id: true, profit: true });
export const insertPaymentSchema = createInsertSchema(payments).omit({ id: true });
export const insertReviewSchema = createInsertSchema(reviews).omit({ id: true, createdAt: true, moderationStatus: true, adminNote: true, adminModifiedAt: true });
export const insertServiceRequestSchema = createInsertSchema(serviceRequests, {
  requestedDate: z.coerce.date(),
}).omit({ id: true, createdAt: true, jobId: true, assignedCleanerId: true, estimatedPrice: true, subcontractorCost: true });
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
