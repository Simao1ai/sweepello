import { db } from "./db";
import { eq, and } from "drizzle-orm";
import {
  clients, cleaners, jobs, payments, reviews, userProfiles, serviceRequests, cleanerAvailability, notifications, jobOffers,
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
} from "@shared/schema";

export interface IStorage {
  getClients(): Promise<Client[]>;
  getClient(id: string): Promise<Client | undefined>;
  getClientByUserId(userId: string): Promise<Client | undefined>;
  createClient(data: InsertClient): Promise<Client>;

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

  getReviews(): Promise<Review[]>;
  getReviewByJobId(jobId: string): Promise<Review | undefined>;
  createReview(data: InsertReview): Promise<Review>;

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

    const [job] = await db.insert(jobs).values({
      ...data,
      profit,
    }).returning();
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
    return db.select().from(notifications).where(eq(notifications.userId, userId));
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
    await db.update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.userId, userId));
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
}

export const storage = new DatabaseStorage();
