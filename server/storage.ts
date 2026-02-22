import { db } from "./db";
import { eq } from "drizzle-orm";
import {
  clients, cleaners, jobs, payments, reviews,
  type Client, type InsertClient,
  type Cleaner, type InsertCleaner,
  type Job, type InsertJob,
  type Payment, type InsertPayment,
  type Review, type InsertReview,
} from "@shared/schema";

export interface IStorage {
  getClients(): Promise<Client[]>;
  getClient(id: string): Promise<Client | undefined>;
  createClient(data: InsertClient): Promise<Client>;

  getCleaners(): Promise<Cleaner[]>;
  getCleaner(id: string): Promise<Cleaner | undefined>;
  createCleaner(data: InsertCleaner): Promise<Cleaner>;
  updateCleaner(id: string, data: Partial<Cleaner>): Promise<Cleaner | undefined>;

  getJobs(): Promise<Job[]>;
  getJob(id: string): Promise<Job | undefined>;
  createJob(data: InsertJob): Promise<Job>;
  updateJob(id: string, data: Partial<Job>): Promise<Job | undefined>;

  getPayments(): Promise<Payment[]>;
  createPayment(data: InsertPayment): Promise<Payment>;

  getReviews(): Promise<Review[]>;
  createReview(data: InsertReview): Promise<Review>;
}

export class DatabaseStorage implements IStorage {
  async getClients(): Promise<Client[]> {
    return db.select().from(clients);
  }

  async getClient(id: string): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.id, id));
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

  async createReview(data: InsertReview): Promise<Review> {
    const [review] = await db.insert(reviews).values(data).returning();
    return review;
  }
}

export const storage = new DatabaseStorage();
