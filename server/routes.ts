import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertClientSchema, insertCleanerSchema, insertJobSchema, insertPaymentSchema, insertReviewSchema } from "@shared/schema";
import { ZodError } from "zod";

function handleZodError(err: unknown) {
  if (err instanceof ZodError) {
    return err.errors.map((e) => e.message).join(", ");
  }
  return (err as Error).message;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.get("/api/clients", async (_req, res) => {
    const clients = await storage.getClients();
    res.json(clients);
  });

  app.post("/api/clients", async (req, res) => {
    try {
      const validated = insertClientSchema.parse(req.body);
      const client = await storage.createClient(validated);
      res.json(client);
    } catch (err: unknown) {
      res.status(400).json({ message: handleZodError(err) });
    }
  });

  app.get("/api/cleaners", async (_req, res) => {
    const cleaners = await storage.getCleaners();
    res.json(cleaners);
  });

  app.post("/api/cleaners", async (req, res) => {
    try {
      const validated = insertCleanerSchema.parse(req.body);
      const cleaner = await storage.createCleaner(validated);
      res.json(cleaner);
    } catch (err: unknown) {
      res.status(400).json({ message: handleZodError(err) });
    }
  });

  app.get("/api/jobs", async (_req, res) => {
    const jobs = await storage.getJobs();
    res.json(jobs);
  });

  app.post("/api/jobs", async (req, res) => {
    try {
      const validated = insertJobSchema.parse(req.body);
      const job = await storage.createJob(validated);

      if (job.cleanerPay) {
        await storage.createPayment({
          jobId: job.id,
          cleanerId: job.cleanerId,
          amount: job.price,
          type: "incoming",
          status: "pending",
          paidAt: null,
        });
        await storage.createPayment({
          jobId: job.id,
          cleanerId: job.cleanerId,
          amount: job.cleanerPay,
          type: "outgoing",
          status: "pending",
          paidAt: null,
        });
      }

      res.json(job);
    } catch (err: unknown) {
      res.status(400).json({ message: handleZodError(err) });
    }
  });

  app.patch("/api/jobs/:id", async (req, res) => {
    try {
      const job = await storage.updateJob(req.params.id, req.body);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }

      if (req.body.status === "completed" && job.cleanerId) {
        const cleaner = await storage.getCleaner(job.cleanerId);
        if (cleaner) {
          await storage.updateCleaner(cleaner.id, {
            totalJobs: (cleaner.totalJobs || 0) + 1,
            totalRevenue: (Number(cleaner.totalRevenue || 0) + Number(job.price)).toFixed(2),
          });
        }
      }

      res.json(job);
    } catch (err: unknown) {
      res.status(400).json({ message: handleZodError(err) });
    }
  });

  app.get("/api/payments", async (_req, res) => {
    const payments = await storage.getPayments();
    res.json(payments);
  });

  app.get("/api/reviews", async (_req, res) => {
    const reviews = await storage.getReviews();
    res.json(reviews);
  });

  app.post("/api/reviews", async (req, res) => {
    try {
      const validated = insertReviewSchema.parse(req.body);
      const review = await storage.createReview(validated);
      res.json(review);
    } catch (err: unknown) {
      res.status(400).json({ message: handleZodError(err) });
    }
  });

  app.get("/api/dashboard/stats", async (_req, res) => {
    const [allJobs, allCleaners, allPayments] = await Promise.all([
      storage.getJobs(),
      storage.getCleaners(),
      storage.getPayments(),
    ]);

    const totalRevenue = allJobs.reduce((sum, j) => sum + Number(j.price), 0);
    const totalProfit = allJobs.reduce((sum, j) => sum + Number(j.profit || 0), 0);
    const marginPercent = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
    const jobsScheduled = allJobs.filter((j) => j.status !== "completed" && j.status !== "cancelled").length;
    const jobsCompleted = allJobs.filter((j) => j.status === "completed").length;
    const activeCleaners = allCleaners.filter((c) => c.status === "active");
    const avgCleanerRating = activeCleaners.length
      ? activeCleaners.reduce((sum, c) => sum + Number(c.rating || 0), 0) / activeCleaners.length
      : 0;
    const pendingPayments = allPayments.filter((p) => p.status === "pending").length;

    res.json({
      totalRevenue,
      totalProfit,
      marginPercent,
      jobsScheduled,
      jobsCompleted,
      avgCleanerRating,
      pendingPayments,
      activeCleaners: activeCleaners.length,
    });
  });

  return httpServer;
}
