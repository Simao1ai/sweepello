import { db } from "./db";
import { clients, cleaners, jobs, payments } from "@shared/schema";
import { sql } from "drizzle-orm";

export async function seedDatabase() {
  const existingClients = await db.select().from(clients);
  if (existingClients.length > 0) {
    return;
  }

  console.log("Seeding database with sample data...");

  const [client1, client2, client3, client4, client5] = await db.insert(clients).values([
    {
      name: "Sarah Mitchell",
      email: "sarah@beachrentals.com",
      phone: "(732) 555-0142",
      propertyAddress: "245 Ocean Ave, Seaside Heights, NJ",
      propertyType: "airbnb",
      notes: "3BR beach house, checkout by 11am",
    },
    {
      name: "Marcus Rodriguez",
      email: "marcus.r@gmail.com",
      phone: "(609) 555-0198",
      propertyAddress: "18 Boardwalk Blvd, Wildwood, NJ",
      propertyType: "airbnb",
      notes: "Condo unit 4B, key in lockbox",
    },
    {
      name: "Jennifer Park",
      email: "jpark@shorebnb.com",
      phone: "(732) 555-0256",
      propertyAddress: "502 Surf Dr, Ortley Beach, NJ",
      propertyType: "vrbo",
      notes: "2BR beachfront, requires deep clean",
    },
    {
      name: "David Chen",
      email: "dchen@properties.com",
      phone: "(908) 555-0134",
      propertyAddress: "89 Marina Way, Point Pleasant, NJ",
      propertyType: "airbnb",
      notes: "Luxury 4BR, premium service required",
    },
    {
      name: "Lisa Thompson",
      email: "lisa.t@outlook.com",
      phone: "(201) 555-0187",
      propertyAddress: "331 Bay Ave, Long Beach Island, NJ",
      propertyType: "residential",
      notes: "Weekly cleaning, no pets",
    },
  ]).returning();

  const [cleaner1, cleaner2, cleaner3, cleaner4] = await db.insert(cleaners).values([
    {
      name: "Maria Garcia",
      email: "maria.garcia@email.com",
      phone: "(732) 555-0301",
      payRate: 70,
      status: "active",
      rating: "4.90",
      onTimePercent: 98,
      totalJobs: 47,
      totalRevenue: "11750.00",
    },
    {
      name: "Ana Santos",
      email: "ana.santos@email.com",
      phone: "(609) 555-0322",
      payRate: 65,
      status: "active",
      rating: "4.75",
      onTimePercent: 95,
      totalJobs: 38,
      totalRevenue: "9500.00",
    },
    {
      name: "Rosa Martinez",
      email: "rosa.m@email.com",
      phone: "(732) 555-0345",
      payRate: 70,
      status: "active",
      rating: "4.95",
      onTimePercent: 100,
      totalJobs: 52,
      totalRevenue: "13000.00",
    },
    {
      name: "Elena Petrov",
      email: "elena.p@email.com",
      phone: "(908) 555-0378",
      payRate: 68,
      status: "active",
      rating: "4.60",
      onTimePercent: 92,
      totalJobs: 29,
      totalRevenue: "7250.00",
    },
  ]).returning();

  const now = new Date();
  const dayMs = 86400000;

  const jobsData = [
    {
      clientId: client1.id,
      cleanerId: cleaner1.id,
      propertyAddress: client1.propertyAddress,
      scheduledDate: new Date(now.getTime() - 2 * dayMs),
      status: "completed",
      price: "275.00",
      cleanerPay: "192.50",
      profit: "82.50",
    },
    {
      clientId: client2.id,
      cleanerId: cleaner2.id,
      propertyAddress: client2.propertyAddress,
      scheduledDate: new Date(now.getTime() - 1 * dayMs),
      status: "completed",
      price: "225.00",
      cleanerPay: "146.25",
      profit: "78.75",
    },
    {
      clientId: client3.id,
      cleanerId: cleaner3.id,
      propertyAddress: client3.propertyAddress,
      scheduledDate: new Date(now.getTime() + 0.5 * dayMs),
      status: "in_progress",
      price: "300.00",
      cleanerPay: "210.00",
      profit: "90.00",
    },
    {
      clientId: client4.id,
      cleanerId: cleaner1.id,
      propertyAddress: client4.propertyAddress,
      scheduledDate: new Date(now.getTime() + 1 * dayMs),
      status: "assigned",
      price: "350.00",
      cleanerPay: "245.00",
      profit: "105.00",
    },
    {
      clientId: client5.id,
      cleanerId: null,
      propertyAddress: client5.propertyAddress,
      scheduledDate: new Date(now.getTime() + 2 * dayMs),
      status: "pending",
      price: "200.00",
      cleanerPay: null,
      profit: null,
    },
    {
      clientId: client1.id,
      cleanerId: cleaner3.id,
      propertyAddress: client1.propertyAddress,
      scheduledDate: new Date(now.getTime() + 3 * dayMs),
      status: "assigned",
      price: "275.00",
      cleanerPay: "192.50",
      profit: "82.50",
    },
    {
      clientId: client2.id,
      cleanerId: cleaner4.id,
      propertyAddress: client2.propertyAddress,
      scheduledDate: new Date(now.getTime() - 5 * dayMs),
      status: "completed",
      price: "225.00",
      cleanerPay: "153.00",
      profit: "72.00",
    },
    {
      clientId: client3.id,
      cleanerId: cleaner2.id,
      propertyAddress: client3.propertyAddress,
      scheduledDate: new Date(now.getTime() - 8 * dayMs),
      status: "completed",
      price: "300.00",
      cleanerPay: "195.00",
      profit: "105.00",
    },
    {
      clientId: client4.id,
      cleanerId: cleaner1.id,
      propertyAddress: client4.propertyAddress,
      scheduledDate: new Date(now.getTime() - 12 * dayMs),
      status: "completed",
      price: "350.00",
      cleanerPay: "245.00",
      profit: "105.00",
    },
    {
      clientId: client5.id,
      cleanerId: cleaner3.id,
      propertyAddress: client5.propertyAddress,
      scheduledDate: new Date(now.getTime() - 15 * dayMs),
      status: "completed",
      price: "200.00",
      cleanerPay: "140.00",
      profit: "60.00",
    },
  ];

  const insertedJobs = await db.insert(jobs).values(jobsData).returning();

  const paymentRows: any[] = [];
  for (const job of insertedJobs) {
    paymentRows.push({
      jobId: job.id,
      cleanerId: job.cleanerId,
      amount: job.price,
      type: "incoming",
      status: job.status === "completed" ? "completed" : "pending",
      paidAt: job.status === "completed" ? new Date() : null,
    });
    if (job.cleanerPay) {
      paymentRows.push({
        jobId: job.id,
        cleanerId: job.cleanerId,
        amount: job.cleanerPay,
        type: "outgoing",
        status: job.status === "completed" ? "completed" : "pending",
        paidAt: job.status === "completed" ? new Date() : null,
      });
    }
  }

  await db.insert(payments).values(paymentRows);

  console.log("Database seeded successfully!");
}
