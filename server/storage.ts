import { db } from "./db";
import { eq, and, desc, gte, lte, sql as drizzleSql } from "drizzle-orm";
import {
  clients, cleaners, jobs, payments, reviews, userProfiles, serviceRequests, cleanerAvailability, notifications, jobOffers, contractorOnboarding, contractorApplications, disputes, messages, aiUsageLogs, recurringBookings, jobPhotos,
  type Client, type InsertClient,
  type Cleaner, type InsertCleaner,
  type Job, type InsertJob,
  type Payment, type InsertPayment,
  type Review, type InsertReview,
  type UserProfile, type InsertUserProfile,
  type ServiceRequest, type InsertServiceRequest,
  type CleanerAvailability, type InsertCleanerAvailability,
  type Notification, type InsertNotification,
  type JobOffer, type InsertJobOffer,
  type ContractorOnboarding, type InsertContractorOnboarding,
  type ContractorApplication, type InsertContractorApplication,
  type Dispute, type InsertDispute,
  type Message, type InsertMessage,
  type AiUsageLog,
  type RecurringBooking, type InsertRecurringBooking,
  type JobPhoto, type InsertJobPhoto,
} from "@shared/schema";

export interface IStorage {
  getClients(): Promise<Client[]>;
  getClient(id: string): Promise<Client | undefined>;
  getClientByUserId(userId: string): Promise<Client | undefined>;
  createClient(data: InsertClient): Promise<Client>;
  updateClient(id: string, data: Partial<Client>): Promise<Client | undefined>;

  getCleaners(): Promise<Cleaner[]>;
  getCleaner(id: string): Promise<Cleaner | undefined>;
  createCleaner(data: InsertCleaner): Promise<Cleaner>;
  updateCleaner(id: string, data: Partial<Cleaner>): Promise<Cleaner | undefined>;

  getJobs(): Promise<Job[]>;
  getJob(id: string): Promise<Job | undefined>;
  getJobsByClientId(clientId: string): Promise<Job[]>;
  createJob(data: InsertJob): Promise<Job>;
  updateJob(id: string, data: Partial<Job>): Promise<Job | undefined>;

  getPayments(): Promise<Payment[]>;
  createPayment(data: InsertPayment): Promise<Payment>;
  updatePayment(id: string, data: Partial<Payment>): Promise<Payment | undefined>;
  getPaymentsByJobId(jobId: string): Promise<Payment[]>;

  getReviews(): Promise<Review[]>;
  getReviewByJobId(jobId: string): Promise<Review | undefined>;
  createReview(data: InsertReview): Promise<Review>;
  updateReview(id: string, data: Partial<Review>): Promise<Review | undefined>;

  getUserProfile(userId: string): Promise<UserProfile | undefined>;
  createUserProfile(data: InsertUserProfile): Promise<UserProfile>;
  updateUserProfile(userId: string, data: Partial<UserProfile>): Promise<UserProfile | undefined>;

  getServiceRequests(): Promise<ServiceRequest[]>;
  getServiceRequestsByUserId(userId: string): Promise<ServiceRequest[]>;
  getServiceRequest(id: string): Promise<ServiceRequest | undefined>;
  createServiceRequest(data: InsertServiceRequest): Promise<ServiceRequest>;
  updateServiceRequest(id: string, data: Partial<ServiceRequest>): Promise<ServiceRequest | undefined>;

  getCleanerAvailability(cleanerId: string): Promise<CleanerAvailability[]>;
  setCleanerAvailability(data: InsertCleanerAvailability): Promise<CleanerAvailability>;
  deleteCleanerAvailability(cleanerId: string): Promise<void>;

  getCleanerByUserId(userId: string): Promise<Cleaner | undefined>;
  getJobsByCleanerId(cleanerId: string): Promise<Job[]>;

  getNotificationsByUserId(userId: string): Promise<Notification[]>;
  createNotification(data: InsertNotification): Promise<Notification>;
  markNotificationRead(id: string, userId: string): Promise<Notification | undefined>;
  markAllNotificationsRead(userId: string): Promise<void>;

  getJobOffersByServiceRequest(serviceRequestId: string): Promise<JobOffer[]>;
  getJobOffersByCleanerId(cleanerId: string): Promise<JobOffer[]>;
  getJobOffer(id: string): Promise<JobOffer | undefined>;
  createJobOffer(data: InsertJobOffer): Promise<JobOffer>;
  updateJobOffer(id: string, data: Partial<JobOffer>): Promise<JobOffer | undefined>;

  getReviewsByCleanerId(cleanerId: string): Promise<Review[]>;
  getReviewsByUserId(userId: string): Promise<Review[]>;

  getAllUserProfiles(): Promise<UserProfile[]>;
  getUsersByRole(role: string): Promise<UserProfile[]>;

  getContractorOnboarding(userId: string): Promise<ContractorOnboarding | undefined>;
  createContractorOnboarding(data: InsertContractorOnboarding): Promise<ContractorOnboarding>;
  updateContractorOnboarding(userId: string, data: Partial<ContractorOnboarding>): Promise<ContractorOnboarding | undefined>;

  getContractorApplications(): Promise<ContractorApplication[]>;
  getContractorApplication(id: string): Promise<ContractorApplication | undefined>;
  getContractorApplicationByEmail(email: string): Promise<ContractorApplication | undefined>;
  createContractorApplication(data: InsertContractorApplication): Promise<ContractorApplication>;
  updateContractorApplication(id: string, data: Partial<ContractorApplication>): Promise<ContractorApplication | undefined>;

  getDisputes(): Promise<Dispute[]>;
  getDispute(id: string): Promise<Dispute | undefined>;
  createDispute(data: InsertDispute): Promise<Dispute>;
  updateDispute(id: string, data: Partial<Dispute>): Promise<Dispute | undefined>;

  getMessagesByJobId(jobId: string): Promise<Message[]>;
  createMessage(data: InsertMessage): Promise<Message>;

  getOnlineCleaners(): Promise<Cleaner[]>;
  updateCleanerOnlineStatus(cleanerId: string, isOnline: boolean, lat?: number, lng?: number): Promise<Cleaner | undefined>;

  rateClientForJob(jobId: string, rating: number, note: string): Promise<Job | undefined>;
  getCleanerByUserIdForUpdate(userId: string): Promise<Cleaner | undefined>;

  // Recurring bookings
  getRecurringBookingsByUserId(userId: string): Promise<RecurringBooking[]>;
  getRecurringBooking(id: string): Promise<RecurringBooking | undefined>;
  createRecurringBooking(data: InsertRecurringBooking): Promise<RecurringBooking>;
  updateRecurringBooking(id: string, data: Partial<RecurringBooking>): Promise<RecurringBooking | undefined>;
  deleteRecurringBooking(id: string): Promise<boolean>;
  getAllRecurringBookings(): Promise<RecurringBooking[]>;
  getActiveRecurringBookingsDue(asOf: Date): Promise<RecurringBooking[]>;

  // Job photos
  getJobPhotos(jobId: string): Promise<JobPhoto[]>;
  createJobPhoto(data: InsertJobPhoto): Promise<JobPhoto>;
  deleteJobPhoto(id: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  async getClients(): Promise<Client[]> {
    return db.select().from(clients);
  }

  async getClient(id: string): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.id, id));
    return client;
  }

  async getClientByUserId(userId: string): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.userId, userId));
    return client;
  }

  async createClient(data: InsertClient): Promise<Client> {
    const [client] = await db.insert(clients).values(data).returning();
    return client;
  }

  async updateClient(id: string, data: Partial<Client>): Promise<Client | undefined> {
    const [client] = await db.update(clients).set(data).where(eq(clients.id, id)).returning();
    return client;
  }

  async getCleaners(): Promise<Cleaner[]> {
    return db.select().from(cleaners);
  }

  async getCleaner(id: string): Promise<Cleaner | undefined> {
    const [cleaner] = await db.select().from(cleaners).where(eq(cleaners.id, id));
    return cleaner;
  }

  async createCleaner(data: InsertCleaner): Promise<Cleaner> {
    const [cleaner] = await db.insert(cleaners).values(data).returning();
    return cleaner;
  }

  async updateCleaner(id: string, data: Partial<Cleaner>): Promise<Cleaner | undefined> {
    const [cleaner] = await db.update(cleaners).set(data).where(eq(cleaners.id, id)).returning();
    return cleaner;
  }

  async getJobs(): Promise<Job[]> {
    return db.select().from(jobs);
  }

  async getJob(id: string): Promise<Job | undefined> {
    const [job] = await db.select().from(jobs).where(eq(jobs.id, id));
    return job;
  }

  async getJobsByClientId(clientId: string): Promise<Job[]> {
    return db.select().from(jobs).where(eq(jobs.clientId, clientId));
  }

  async createJob(data: InsertJob): Promise<Job> {
    const price = Number(data.price);
    const cleanerPay = data.cleanerPay ? Number(data.cleanerPay) : null;
    const profit = cleanerPay ? (price - cleanerPay).toFixed(2) : null;
    const [job] = await db.insert(jobs).values({ ...data, profit }).returning();
    return job;
  }

  async updateJob(id: string, data: Partial<Job>): Promise<Job | undefined> {
    const [job] = await db.update(jobs).set(data).where(eq(jobs.id, id)).returning();
    return job;
  }

  async getPayments(): Promise<Payment[]> {
    return db.select().from(payments);
  }

  async createPayment(data: InsertPayment): Promise<Payment> {
    const [payment] = await db.insert(payments).values(data).returning();
    return payment;
  }

  async updatePayment(id: string, data: Partial<Payment>): Promise<Payment | undefined> {
    const [payment] = await db.update(payments).set(data).where(eq(payments.id, id)).returning();
    return payment;
  }

  async getPaymentsByJobId(jobId: string): Promise<Payment[]> {
    return db.select().from(payments).where(eq(payments.jobId, jobId));
  }

  async getReviews(): Promise<Review[]> {
    return db.select().from(reviews);
  }

  async getReviewByJobId(jobId: string): Promise<Review | undefined> {
    const [review] = await db.select().from(reviews).where(eq(reviews.jobId, jobId));
    return review;
  }

  async createReview(data: InsertReview): Promise<Review> {
    const [review] = await db.insert(reviews).values(data).returning();
    return review;
  }

  async updateReview(id: string, data: Partial<Review>): Promise<Review | undefined> {
    const [review] = await db.update(reviews).set({ ...data, adminModifiedAt: new Date() }).where(eq(reviews.id, id)).returning();
    return review;
  }

  async getUserProfile(userId: string): Promise<UserProfile | undefined> {
    const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId));
    return profile;
  }

  async createUserProfile(data: InsertUserProfile): Promise<UserProfile> {
    const [profile] = await db.insert(userProfiles).values(data).returning();
    return profile;
  }

  async updateUserProfile(userId: string, data: Partial<UserProfile>): Promise<UserProfile | undefined> {
    const [profile] = await db.update(userProfiles).set(data).where(eq(userProfiles.userId, userId)).returning();
    return profile;
  }

  async getServiceRequests(): Promise<ServiceRequest[]> {
    return db.select().from(serviceRequests);
  }

  async getServiceRequestsByUserId(userId: string): Promise<ServiceRequest[]> {
    return db.select().from(serviceRequests).where(eq(serviceRequests.userId, userId));
  }

  async getServiceRequest(id: string): Promise<ServiceRequest | undefined> {
    const [request] = await db.select().from(serviceRequests).where(eq(serviceRequests.id, id));
    return request;
  }

  async createServiceRequest(data: InsertServiceRequest): Promise<ServiceRequest> {
    const [request] = await db.insert(serviceRequests).values(data).returning();
    return request;
  }

  async updateServiceRequest(id: string, data: Partial<ServiceRequest>): Promise<ServiceRequest | undefined> {
    const [request] = await db.update(serviceRequests).set(data).where(eq(serviceRequests.id, id)).returning();
    return request;
  }

  async getCleanerAvailability(cleanerId: string): Promise<CleanerAvailability[]> {
    return db.select().from(cleanerAvailability).where(eq(cleanerAvailability.cleanerId, cleanerId));
  }

  async setCleanerAvailability(data: InsertCleanerAvailability): Promise<CleanerAvailability> {
    const [avail] = await db.insert(cleanerAvailability).values(data).returning();
    return avail;
  }

  async deleteCleanerAvailability(cleanerId: string): Promise<void> {
    await db.delete(cleanerAvailability).where(eq(cleanerAvailability.cleanerId, cleanerId));
  }

  async getCleanerByUserId(userId: string): Promise<Cleaner | undefined> {
    const [cleaner] = await db.select().from(cleaners).where(eq(cleaners.userId, userId));
    return cleaner;
  }

  async getJobsByCleanerId(cleanerId: string): Promise<Job[]> {
    return db.select().from(jobs).where(eq(jobs.cleanerId, cleanerId));
  }

  async getNotificationsByUserId(userId: string): Promise<Notification[]> {
    return db.select().from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async createNotification(data: InsertNotification): Promise<Notification> {
    const [notification] = await db.insert(notifications).values(data).returning();
    return notification;
  }

  async markNotificationRead(id: string, userId: string): Promise<Notification | undefined> {
    const [notification] = await db.update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
      .returning();
    return notification;
  }

  async markAllNotificationsRead(userId: string): Promise<void> {
    await db.update(notifications).set({ isRead: true }).where(eq(notifications.userId, userId));
  }

  async getJobOffersByServiceRequest(serviceRequestId: string): Promise<JobOffer[]> {
    return db.select().from(jobOffers).where(eq(jobOffers.serviceRequestId, serviceRequestId));
  }

  async getJobOffersByCleanerId(cleanerId: string): Promise<JobOffer[]> {
    return db.select().from(jobOffers).where(eq(jobOffers.cleanerId, cleanerId));
  }

  async getJobOffer(id: string): Promise<JobOffer | undefined> {
    const [offer] = await db.select().from(jobOffers).where(eq(jobOffers.id, id));
    return offer;
  }

  async createJobOffer(data: InsertJobOffer): Promise<JobOffer> {
    const [offer] = await db.insert(jobOffers).values(data).returning();
    return offer;
  }

  async updateJobOffer(id: string, data: Partial<JobOffer>): Promise<JobOffer | undefined> {
    const [offer] = await db.update(jobOffers).set(data).where(eq(jobOffers.id, id)).returning();
    return offer;
  }

  async getReviewsByCleanerId(cleanerId: string): Promise<Review[]> {
    return db.select().from(reviews).where(eq(reviews.cleanerId, cleanerId));
  }

  async getReviewsByUserId(userId: string): Promise<Review[]> {
    return db.select().from(reviews).where(eq(reviews.userId, userId));
  }

  async getAllUserProfiles(): Promise<UserProfile[]> {
    return db.select().from(userProfiles);
  }

  async getUsersByRole(role: string): Promise<UserProfile[]> {
    return db.select().from(userProfiles).where(eq(userProfiles.role, role as any));
  }

  async getContractorOnboarding(userId: string): Promise<ContractorOnboarding | undefined> {
    const [onboarding] = await db.select().from(contractorOnboarding).where(eq(contractorOnboarding.userId, userId));
    return onboarding;
  }

  async createContractorOnboarding(data: InsertContractorOnboarding): Promise<ContractorOnboarding> {
    const [onboarding] = await db.insert(contractorOnboarding).values(data).returning();
    return onboarding;
  }

  async updateContractorOnboarding(userId: string, data: Partial<ContractorOnboarding>): Promise<ContractorOnboarding | undefined> {
    const [onboarding] = await db.update(contractorOnboarding)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(contractorOnboarding.userId, userId))
      .returning();
    return onboarding;
  }

  async getContractorApplications(): Promise<ContractorApplication[]> {
    return db.select().from(contractorApplications);
  }

  async getContractorApplication(id: string): Promise<ContractorApplication | undefined> {
    const [app] = await db.select().from(contractorApplications).where(eq(contractorApplications.id, id));
    return app;
  }

  async getContractorApplicationByEmail(email: string): Promise<ContractorApplication | undefined> {
    const [app] = await db.select().from(contractorApplications).where(eq(contractorApplications.email, email));
    return app;
  }

  async createContractorApplication(data: InsertContractorApplication): Promise<ContractorApplication> {
    const [app] = await db.insert(contractorApplications).values(data).returning();
    return app;
  }

  async updateContractorApplication(id: string, data: Partial<ContractorApplication>): Promise<ContractorApplication | undefined> {
    const [app] = await db.update(contractorApplications).set(data).where(eq(contractorApplications.id, id)).returning();
    return app;
  }

  async getDisputes(): Promise<Dispute[]> {
    return db.select().from(disputes);
  }

  async getDispute(id: string): Promise<Dispute | undefined> {
    const [dispute] = await db.select().from(disputes).where(eq(disputes.id, id));
    return dispute;
  }

  async createDispute(data: InsertDispute): Promise<Dispute> {
    const [dispute] = await db.insert(disputes).values(data).returning();
    return dispute;
  }

  async updateDispute(id: string, data: Partial<Dispute>): Promise<Dispute | undefined> {
    const [dispute] = await db.update(disputes).set(data).where(eq(disputes.id, id)).returning();
    return dispute;
  }

  async getMessagesByJobId(jobId: string): Promise<Message[]> {
    return db.select().from(messages).where(eq(messages.jobId, jobId));
  }

  async createMessage(data: InsertMessage): Promise<Message> {
    const [message] = await db.insert(messages).values(data).returning();
    return message;
  }

  async getOnlineCleaners(): Promise<Cleaner[]> {
    return db.select().from(cleaners).where(eq(cleaners.isOnline, true));
  }

  async updateCleanerOnlineStatus(cleanerId: string, isOnline: boolean, lat?: number, lng?: number): Promise<Cleaner | undefined> {
    const updateData: Partial<Cleaner> = { isOnline, lastSeenAt: new Date() };
    if (lat !== undefined) updateData.currentLat = lat.toString();
    if (lng !== undefined) updateData.currentLng = lng.toString();
    const [cleaner] = await db.update(cleaners).set(updateData).where(eq(cleaners.id, cleanerId)).returning();
    return cleaner;
  }

  async rateClientForJob(jobId: string, rating: number, note: string): Promise<Job | undefined> {
    const [job] = await db.update(jobs)
      .set({ clientRating: rating, clientRatingNote: note })
      .where(eq(jobs.id, jobId))
      .returning();
    return job;
  }

  async getCleanerByUserIdForUpdate(userId: string): Promise<Cleaner | undefined> {
    return this.getCleanerByUserId(userId);
  }

  async createAiUsageLog(data: {
    adminUserId?: string;
    model: string;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    costUsd: string;
    rounds: number;
    userMessage?: string;
  }): Promise<AiUsageLog> {
    const [log] = await db.insert(aiUsageLogs).values(data).returning();
    return log;
  }

  async getAiUsageLogs(limit = 100): Promise<AiUsageLog[]> {
    return db.select().from(aiUsageLogs).orderBy(desc(aiUsageLogs.createdAt)).limit(limit);
  }

  async getAiUsageStats(): Promise<{
    todayCost: number;
    monthCost: number;
    allTimeCost: number;
    totalConversations: number;
    totalTokens: number;
    dailyUsage: { date: string; cost: number; tokens: number; conversations: number }[];
  }> {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const all = await db.select().from(aiUsageLogs).orderBy(desc(aiUsageLogs.createdAt));

    const todayCost = all
      .filter(l => new Date(l.createdAt!) >= todayStart)
      .reduce((s, l) => s + parseFloat(l.costUsd || "0"), 0);

    const monthCost = all
      .filter(l => new Date(l.createdAt!) >= monthStart)
      .reduce((s, l) => s + parseFloat(l.costUsd || "0"), 0);

    const allTimeCost = all.reduce((s, l) => s + parseFloat(l.costUsd || "0"), 0);
    const totalTokens = all.reduce((s, l) => s + (l.totalTokens || 0), 0);

    // Build daily buckets for last 30 days
    const dailyMap: Record<string, { cost: number; tokens: number; conversations: number }> = {};
    for (let i = 0; i < 30; i++) {
      const d = new Date(thirtyDaysAgo.getTime() + i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().split("T")[0];
      dailyMap[key] = { cost: 0, tokens: 0, conversations: 0 };
    }
    for (const log of all) {
      const key = new Date(log.createdAt!).toISOString().split("T")[0];
      if (dailyMap[key]) {
        dailyMap[key].cost += parseFloat(log.costUsd || "0");
        dailyMap[key].tokens += log.totalTokens || 0;
        dailyMap[key].conversations += 1;
      }
    }

    const dailyUsage = Object.entries(dailyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({ date, ...v }));

    return {
      todayCost,
      monthCost,
      allTimeCost,
      totalConversations: all.length,
      totalTokens,
      dailyUsage,
    };
  }

  // === RECURRING BOOKINGS ===
  async getRecurringBookingsByUserId(userId: string): Promise<RecurringBooking[]> {
    return db.select().from(recurringBookings).where(eq(recurringBookings.userId, userId)).orderBy(desc(recurringBookings.createdAt));
  }

  async getRecurringBooking(id: string): Promise<RecurringBooking | undefined> {
    const [rb] = await db.select().from(recurringBookings).where(eq(recurringBookings.id, id));
    return rb;
  }

  async createRecurringBooking(data: InsertRecurringBooking): Promise<RecurringBooking> {
    const [rb] = await db.insert(recurringBookings).values(data).returning();
    return rb;
  }

  async updateRecurringBooking(id: string, data: Partial<RecurringBooking>): Promise<RecurringBooking | undefined> {
    const [rb] = await db.update(recurringBookings).set(data).where(eq(recurringBookings.id, id)).returning();
    return rb;
  }

  async deleteRecurringBooking(id: string): Promise<boolean> {
    const result = await db.delete(recurringBookings).where(eq(recurringBookings.id, id)).returning();
    return result.length > 0;
  }

  async getAllRecurringBookings(): Promise<RecurringBooking[]> {
    return db.select().from(recurringBookings).orderBy(desc(recurringBookings.createdAt));
  }

  async getActiveRecurringBookingsDue(asOf: Date): Promise<RecurringBooking[]> {
    return db.select().from(recurringBookings).where(
      and(
        eq(recurringBookings.isActive, true),
        lte(recurringBookings.nextServiceDate, asOf),
      )
    );
  }

  // === JOB PHOTOS ===
  async getJobPhotos(jobId: string): Promise<JobPhoto[]> {
    return db.select().from(jobPhotos).where(eq(jobPhotos.jobId, jobId)).orderBy(jobPhotos.createdAt);
  }

  async createJobPhoto(data: InsertJobPhoto): Promise<JobPhoto> {
    const [photo] = await db.insert(jobPhotos).values(data).returning();
    return photo;
  }

  async deleteJobPhoto(id: string): Promise<boolean> {
    const result = await db.delete(jobPhotos).where(eq(jobPhotos.id, id)).returning();
    return result.length > 0;
  }
}

export const storage = new DatabaseStorage();
