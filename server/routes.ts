import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { isAuthenticated } from "./replit_integrations/auth";
import {
  insertClientSchema, insertCleanerSchema, insertJobSchema,
  insertPaymentSchema, insertReviewSchema, insertServiceRequestSchema,
  insertCleanerAvailabilitySchema, insertUserProfileSchema, insertNotificationSchema,
  insertContractorOnboardingSchema,
} from "@shared/schema";
import { ZodError } from "zod";
import { calculatePrice, calculateBrokeragePrice, broadcastJobOffers, acceptJobOffer, declineJobOffer, findMatchingCleaners } from "./matching";
import { getUncachableStripeClient, getStripePublishableKey } from "./stripeClient";

function handleZodError(err: unknown) {
  if (err instanceof ZodError) {
    return err.errors.map((e) => e.message).join(", ");
  }
  return (err as Error).message;
}

function getUserId(req: any): string {
  return req.user?.claims?.sub;
}

async function isAdmin(req: any): Promise<boolean> {
  const userId = getUserId(req);
  if (!userId) return false;
  const profile = await storage.getUserProfile(userId);
  return profile?.role === "admin";
}

async function isContractor(req: any): Promise<boolean> {
  const userId = getUserId(req);
  if (!userId) return false;
  const profile = await storage.getUserProfile(userId);
  return profile?.role === "contractor";
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // === USER PROFILE ROUTES ===
  app.get("/api/profile", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    const profile = await storage.getUserProfile(userId);
    res.json(profile || null);
  });

  app.post("/api/profile", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const existing = await storage.getUserProfile(userId);
      const { role: _ignoredRole, ...safeBody } = req.body;
      if (existing) {
        const updated = await storage.updateUserProfile(userId, safeBody);
        return res.json(updated);
      }
      const validated = insertUserProfileSchema.parse({ ...safeBody, userId, role: "client" });
      const profile = await storage.createUserProfile(validated);
      res.json(profile);
    } catch (err: unknown) {
      res.status(400).json({ message: handleZodError(err) });
    }
  });

  // === CLIENT PORTAL ROUTES ===
  app.post("/api/service-requests", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const validated = insertServiceRequestSchema.parse({ ...req.body, userId });
      const request = await storage.createServiceRequest(validated);

      const bedrooms = request.bedrooms || 2;
      const bathrooms = request.bathrooms || 1;
      const serviceType = request.serviceType || "standard";
      const sqft = request.squareFootage || 1000;
      const basement = request.basement || false;
      const pricing = calculateBrokeragePrice(serviceType, bedrooms, bathrooms, sqft, basement);
      const updated = await storage.updateServiceRequest(request.id, {
        estimatedPrice: String(pricing.clientPrice),
        subcontractorCost: String(pricing.subcontractorCost),
      });

      try {
        await broadcastJobOffers(updated!.id);
      } catch (broadcastErr) {
        console.error("Auto-broadcast failed:", broadcastErr);
      }

      res.json(updated);
    } catch (err: unknown) {
      res.status(400).json({ message: handleZodError(err) });
    }
  });

  app.get("/api/pricing-estimate", async (req, res) => {
    const { serviceType, bedrooms, bathrooms, squareFootage, basement } = req.query;
    const pricing = calculateBrokeragePrice(
      String(serviceType || "standard"),
      Number(bedrooms || 2),
      Number(bathrooms || 1),
      Number(squareFootage || 1000),
      basement === "true"
    );
    res.json({
      estimatedPrice: pricing.clientPrice,
      subcontractorCost: pricing.subcontractorCost,
      platformFee: pricing.platformFee,
      marginPercent: pricing.marginPercent,
    });
  });

  app.get("/api/client/previous-cleaners", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    const myRequests = await storage.getServiceRequestsByUserId(userId);
    const completedWithCleaner = myRequests.filter(r => r.status === "completed" && r.assignedCleanerId);
    const cleanerIds = [...new Set(completedWithCleaner.map(r => r.assignedCleanerId!))];
    const cleanerList = [];
    for (const id of cleanerIds) {
      const cleaner = await storage.getCleaner(id);
      if (cleaner && cleaner.status === "active") {
        cleanerList.push({ id: cleaner.id, name: cleaner.name, rating: cleaner.rating });
      }
    }
    cleanerList.sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0));
    res.json(cleanerList);
  });

  app.get("/api/service-requests/mine", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    const requests = await storage.getServiceRequestsByUserId(userId);
    res.json(requests);
  });

  app.get("/api/service-requests/:id", isAuthenticated, async (req, res) => {
    const request = await storage.getServiceRequest(req.params.id);
    if (!request) return res.status(404).json({ message: "Not found" });
    const userId = getUserId(req);
    const admin = await isAdmin(req);
    if (request.userId !== userId && !admin) {
      return res.status(403).json({ message: "Forbidden" });
    }
    res.json(request);
  });

  app.post("/api/service-requests/:id/rate", isAuthenticated, async (req, res) => {
    try {
      const request = await storage.getServiceRequest(req.params.id);
      if (!request) return res.status(404).json({ message: "Not found" });
      const userId = getUserId(req);
      if (request.userId !== userId) return res.status(403).json({ message: "Forbidden" });
      if (request.status !== "completed") return res.status(400).json({ message: "Can only rate completed services" });
      if (!request.jobId) return res.status(400).json({ message: "No job associated" });

      const existingReview = await storage.getReviewByJobId(request.jobId);
      if (existingReview) return res.status(400).json({ message: "Already rated" });

      const job = await storage.getJob(request.jobId);
      if (!job) return res.status(404).json({ message: "Job not found" });

      const review = await storage.createReview({
        jobId: request.jobId,
        clientId: job.clientId,
        cleanerId: job.cleanerId || "",
        userId,
        rating: req.body.rating,
        comment: req.body.comment || null,
      });

      if (job.cleanerId) {
        const allReviews = await storage.getReviews();
        const cleanerReviews = allReviews.filter(r => r.cleanerId === job.cleanerId);
        const avgRating = cleanerReviews.reduce((s, r) => s + r.rating, 0) / cleanerReviews.length;
        await storage.updateCleaner(job.cleanerId, { rating: avgRating.toFixed(2) });
      }

      res.json(review);
    } catch (err: unknown) {
      res.status(400).json({ message: handleZodError(err) });
    }
  });

  // === MATCHING ROUTE - find available cleaners by location/date ===
  app.get("/api/available-cleaners", isAuthenticated, async (req, res) => {
    const { zipCode, date } = req.query;
    const allCleaners = await storage.getCleaners();
    const activeCleaners = allCleaners.filter(c => c.status === "active");

    let matched = activeCleaners;
    if (zipCode) {
      matched = matched.filter(c => {
        if (!c.zipCodes) return true;
        return c.zipCodes.split(",").map(z => z.trim()).includes(String(zipCode));
      });
    }

    if (date) {
      const requestedDate = new Date(String(date));
      const dayOfWeek = requestedDate.getDay();

      const availableCleanerIds: string[] = [];
      for (const cleaner of matched) {
        const availability = await storage.getCleanerAvailability(cleaner.id);
        if (availability.length === 0) {
          availableCleanerIds.push(cleaner.id);
          continue;
        }
        const dayAvail = availability.find(a => a.dayOfWeek === dayOfWeek);
        if (dayAvail && dayAvail.isAvailable) {
          availableCleanerIds.push(cleaner.id);
        }
      }
      matched = matched.filter(c => availableCleanerIds.includes(c.id));
    }

    res.json(matched);
  });

  // === ADMIN ROUTES ===
  app.get("/api/clients", async (_req, res) => {
    const allClients = await storage.getClients();
    res.json(allClients);
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
    const allCleaners = await storage.getCleaners();
    res.json(allCleaners);
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
    const allJobs = await storage.getJobs();
    res.json(allJobs);
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

        if (job.serviceRequestId) {
          await storage.updateServiceRequest(job.serviceRequestId, { status: "completed" });
        }
      }

      res.json(job);
    } catch (err: unknown) {
      res.status(400).json({ message: handleZodError(err) });
    }
  });

  app.get("/api/payments", async (_req, res) => {
    const allPayments = await storage.getPayments();
    res.json(allPayments);
  });

  app.get("/api/reviews", async (_req, res) => {
    const allReviews = await storage.getReviews();
    res.json(allReviews);
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

  // === SERVICE REQUESTS ADMIN ===
  app.get("/api/service-requests", isAuthenticated, async (req, res) => {
    const admin = await isAdmin(req);
    if (!admin) return res.status(403).json({ message: "Admin only" });
    const requests = await storage.getServiceRequests();
    res.json(requests);
  });

  app.patch("/api/service-requests/:id", isAuthenticated, async (req, res) => {
    try {
      const admin = await isAdmin(req);
      if (!admin) return res.status(403).json({ message: "Admin only" });

      const request = await storage.getServiceRequest(req.params.id);
      if (!request) return res.status(404).json({ message: "Not found" });

      if (req.body.assignedCleanerId && req.body.status === "confirmed") {
        const cleaner = await storage.getCleaner(req.body.assignedCleanerId);
        if (!cleaner) return res.status(400).json({ message: "Cleaner not found" });

        let client = await storage.getClientByUserId(request.userId);
        if (!client) {
          client = await storage.createClient({
            name: "Client",
            email: null,
            phone: null,
            propertyAddress: request.propertyAddress,
            propertyType: request.propertyType,
            userId: request.userId,
            city: request.city,
            zipCode: request.zipCode,
            bedrooms: request.bedrooms,
            bathrooms: request.bathrooms,
            notes: null,
          });
        }

        const job = await storage.createJob({
          clientId: client.id,
          cleanerId: req.body.assignedCleanerId,
          propertyAddress: request.propertyAddress,
          scheduledDate: request.requestedDate,
          status: "assigned",
          price: request.estimatedPrice || "150.00",
          cleanerPay: String(cleaner.payRate),
          serviceRequestId: request.id,
          notes: request.specialInstructions,
        });

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
          amount: job.cleanerPay!,
          type: "outgoing",
          status: "pending",
          paidAt: null,
        });

        const updated = await storage.updateServiceRequest(request.id, {
          status: "confirmed",
          assignedCleanerId: req.body.assignedCleanerId,
          jobId: job.id,
        });

        if (cleaner.userId) {
          const scheduledDate = new Date(request.requestedDate).toLocaleDateString("en-US", {
            weekday: "short", month: "short", day: "numeric",
          });
          await storage.createNotification({
            userId: cleaner.userId,
            title: "New Cleaning Scheduled",
            message: `You've been assigned a cleaning at ${request.propertyAddress} on ${scheduledDate}.`,
            type: "job_assigned",
            jobId: job.id,
          });
        }

        return res.json(updated);
      }

      const updated = await storage.updateServiceRequest(req.params.id, req.body);
      res.json(updated);
    } catch (err: unknown) {
      res.status(400).json({ message: handleZodError(err) });
    }
  });

  app.post("/api/service-requests/:id/broadcast", isAuthenticated, async (req, res) => {
    try {
      const admin = await isAdmin(req);
      if (!admin) return res.status(403).json({ message: "Admin only" });
      const result = await broadcastJobOffers(req.params.id);
      res.json(result);
    } catch (err: unknown) {
      res.status(400).json({ message: (err as Error).message });
    }
  });

  app.get("/api/service-requests/:id/offers", isAuthenticated, async (req, res) => {
    const admin = await isAdmin(req);
    if (!admin) return res.status(403).json({ message: "Admin only" });
    const offers = await storage.getJobOffersByServiceRequest(req.params.id);
    const enriched = [];
    for (const offer of offers) {
      const cleaner = await storage.getCleaner(offer.cleanerId);
      enriched.push({ ...offer, cleanerName: cleaner?.name || "Unknown", cleanerRating: cleaner?.rating });
    }
    res.json(enriched);
  });

  // === CLEANER AVAILABILITY ===
  app.get("/api/cleaner-availability/:cleanerId", async (req, res) => {
    const availability = await storage.getCleanerAvailability(req.params.cleanerId);
    res.json(availability);
  });

  app.post("/api/cleaner-availability/:cleanerId", isAuthenticated, async (req, res) => {
    try {
      const admin = await isAdmin(req);
      if (!admin) return res.status(403).json({ message: "Admin only" });

      await storage.deleteCleanerAvailability(req.params.cleanerId);

      const slots = req.body.slots || [];
      const results = [];
      for (const slot of slots) {
        const validated = insertCleanerAvailabilitySchema.parse({
          cleanerId: req.params.cleanerId,
          ...slot,
        });
        const avail = await storage.setCleanerAvailability(validated);
        results.push(avail);
      }
      res.json(results);
    } catch (err: unknown) {
      res.status(400).json({ message: handleZodError(err) });
    }
  });

  // === CONTRACTOR PORTAL ROUTES ===
  app.get("/api/contractor/profile", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    const contractor = await isContractor(req);
    if (!contractor) return res.status(403).json({ message: "Contractor only" });
    const cleaner = await storage.getCleanerByUserId(userId);
    if (!cleaner) return res.status(404).json({ message: "No contractor profile linked" });
    res.json(cleaner);
  });

  app.get("/api/contractor/jobs", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    const contractor = await isContractor(req);
    if (!contractor) return res.status(403).json({ message: "Contractor only" });
    const cleaner = await storage.getCleanerByUserId(userId);
    if (!cleaner) return res.status(404).json({ message: "No contractor profile linked" });
    const contractorJobs = await storage.getJobsByCleanerId(cleaner.id);
    res.json(contractorJobs);
  });

  app.get("/api/contractor/availability", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    const contractor = await isContractor(req);
    if (!contractor) return res.status(403).json({ message: "Contractor only" });
    const cleaner = await storage.getCleanerByUserId(userId);
    if (!cleaner) return res.status(404).json({ message: "No contractor profile linked" });
    const availability = await storage.getCleanerAvailability(cleaner.id);
    res.json(availability);
  });

  app.post("/api/contractor/availability", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const contractor = await isContractor(req);
      if (!contractor) return res.status(403).json({ message: "Contractor only" });
      const cleaner = await storage.getCleanerByUserId(userId);
      if (!cleaner) return res.status(404).json({ message: "No contractor profile linked" });

      await storage.deleteCleanerAvailability(cleaner.id);
      const slots = req.body.slots || [];
      const results = [];
      for (const slot of slots) {
        const validated = insertCleanerAvailabilitySchema.parse({
          cleanerId: cleaner.id,
          ...slot,
        });
        const avail = await storage.setCleanerAvailability(validated);
        results.push(avail);
      }
      res.json(results);
    } catch (err: unknown) {
      res.status(400).json({ message: handleZodError(err) });
    }
  });

  app.patch("/api/contractor/jobs/:id/status", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const contractor = await isContractor(req);
      if (!contractor) return res.status(403).json({ message: "Contractor only" });
      const cleaner = await storage.getCleanerByUserId(userId);
      if (!cleaner) return res.status(404).json({ message: "No contractor profile linked" });

      const job = await storage.getJob(req.params.id);
      if (!job) return res.status(404).json({ message: "Job not found" });
      if (job.cleanerId !== cleaner.id) return res.status(403).json({ message: "Not your job" });

      const { status } = req.body;
      if (!["in_progress", "completed"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      const updated = await storage.updateJob(job.id, { status });

      if (status === "completed") {
        await storage.updateCleaner(cleaner.id, {
          totalJobs: (cleaner.totalJobs || 0) + 1,
          totalRevenue: (Number(cleaner.totalRevenue || 0) + Number(job.price)).toFixed(2),
        });
        if (job.serviceRequestId) {
          await storage.updateServiceRequest(job.serviceRequestId, { status: "completed" });
        }
      }

      res.json(updated);
    } catch (err: unknown) {
      res.status(400).json({ message: handleZodError(err) });
    }
  });

  // === CONTRACTOR OFFER ROUTES ===
  app.get("/api/contractor/offers", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    const contractor = await isContractor(req);
    if (!contractor) return res.status(403).json({ message: "Contractor only" });
    const cleaner = await storage.getCleanerByUserId(userId);
    if (!cleaner) return res.status(404).json({ message: "No contractor profile linked" });
    const offers = await storage.getJobOffersByCleanerId(cleaner.id);
    const enrichedOffers = [];
    for (const offer of offers) {
      const request = await storage.getServiceRequest(offer.serviceRequestId);
      enrichedOffers.push({ ...offer, serviceRequest: request });
    }
    res.json(enrichedOffers);
  });

  app.post("/api/contractor/offers/:id/accept", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const contractor = await isContractor(req);
      if (!contractor) return res.status(403).json({ message: "Contractor only" });
      const cleaner = await storage.getCleanerByUserId(userId);
      if (!cleaner) return res.status(404).json({ message: "No contractor profile linked" });

      const result = await acceptJobOffer(req.params.id, cleaner.id);
      if (!result.success) return res.status(400).json({ message: result.message });
      res.json(result);
    } catch (err: unknown) {
      res.status(400).json({ message: (err as Error).message });
    }
  });

  app.post("/api/contractor/offers/:id/decline", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const contractor = await isContractor(req);
      if (!contractor) return res.status(403).json({ message: "Contractor only" });
      const cleaner = await storage.getCleanerByUserId(userId);
      if (!cleaner) return res.status(404).json({ message: "No contractor profile linked" });

      const result = await declineJobOffer(req.params.id, cleaner.id);
      if (!result.success) return res.status(400).json({ message: result.message });
      res.json(result);
    } catch (err: unknown) {
      res.status(400).json({ message: (err as Error).message });
    }
  });

  // === NOTIFICATION ROUTES ===
  app.get("/api/notifications", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    const notifs = await storage.getNotificationsByUserId(userId);
    res.json(notifs);
  });

  app.patch("/api/notifications/:id/read", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    const notification = await storage.markNotificationRead(req.params.id, userId);
    if (!notification) return res.status(404).json({ message: "Not found" });
    res.json(notification);
  });

  app.post("/api/notifications/read-all", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    await storage.markAllNotificationsRead(userId);
    res.json({ success: true });
  });

  // === DASHBOARD STATS ===
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

  // === CALENDAR DATA ===
  app.get("/api/calendar", async (req, res) => {
    const [allJobs, allCleaners] = await Promise.all([
      storage.getJobs(),
      storage.getCleaners(),
    ]);

    const events = allJobs.map(job => {
      const cleaner = allCleaners.find(c => c.id === job.cleanerId);
      return {
        id: job.id,
        title: cleaner ? cleaner.name : "Unassigned",
        start: job.scheduledDate,
        address: job.propertyAddress,
        status: job.status,
        cleanerName: cleaner?.name || "Unassigned",
        cleanerId: job.cleanerId,
        price: job.price,
      };
    });

    res.json(events);
  });

  // === CONTRACTOR ONBOARDING ROUTES ===
  app.get("/api/contractor/onboarding", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    const profile = await storage.getUserProfile(userId);
    if (!profile || profile.role !== "contractor") {
      return res.status(403).json({ message: "Contractor only" });
    }
    const onboarding = await storage.getContractorOnboarding(userId);
    res.json(onboarding || null);
  });

  app.post("/api/contractor/onboarding", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const profile = await storage.getUserProfile(userId);
      if (!profile || profile.role !== "contractor") {
        return res.status(403).json({ message: "Contractor only" });
      }

      const existing = await storage.getContractorOnboarding(userId);
      if (existing) {
        const updated = await storage.updateContractorOnboarding(userId, req.body);
        return res.json(updated);
      }

      const validated = insertContractorOnboardingSchema.parse({ ...req.body, userId });
      const onboarding = await storage.createContractorOnboarding(validated);
      res.json(onboarding);
    } catch (err: unknown) {
      res.status(400).json({ message: handleZodError(err) });
    }
  });

  app.post("/api/contractor/onboarding/w9", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const profile = await storage.getUserProfile(userId);
      if (!profile || profile.role !== "contractor") {
        return res.status(403).json({ message: "Contractor only" });
      }

      const { signatureName } = req.body;
      if (!signatureName) return res.status(400).json({ message: "Signature name required" });

      const updated = await storage.updateContractorOnboarding(userId, {
        w9Signed: true,
        w9SignedAt: new Date(),
        w9SignatureName: signatureName,
      });
      if (!updated) return res.status(404).json({ message: "Onboarding record not found. Complete Step 1 first." });
      res.json(updated);
    } catch (err: unknown) {
      res.status(400).json({ message: (err as Error).message });
    }
  });

  app.post("/api/contractor/onboarding/insurance", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const profile = await storage.getUserProfile(userId);
      if (!profile || profile.role !== "contractor") {
        return res.status(403).json({ message: "Contractor only" });
      }

      const { insuranceProvider, insurancePolicyNumber, insuranceExpirationDate, hasInsurance } = req.body;
      const updated = await storage.updateContractorOnboarding(userId, {
        insuranceProvider: insuranceProvider || null,
        insurancePolicyNumber: insurancePolicyNumber || null,
        insuranceExpirationDate: insuranceExpirationDate || null,
        hasInsurance: hasInsurance === true,
      });
      if (!updated) return res.status(404).json({ message: "Onboarding record not found. Complete Step 1 first." });
      res.json(updated);
    } catch (err: unknown) {
      res.status(400).json({ message: (err as Error).message });
    }
  });

  app.post("/api/contractor/onboarding/stripe-connect", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const profile = await storage.getUserProfile(userId);
      if (!profile || profile.role !== "contractor") {
        return res.status(403).json({ message: "Contractor only" });
      }

      const onboarding = await storage.getContractorOnboarding(userId);
      if (!onboarding) return res.status(404).json({ message: "Complete onboarding steps first" });

      const stripe = await getUncachableStripeClient();

      let accountId = onboarding.stripeAccountId;
      if (!accountId) {
        const account = await stripe.accounts.create({
          type: "express",
          country: "US",
          email: onboarding.email,
          capabilities: {
            transfers: { requested: true },
          },
          business_type: "individual",
          metadata: {
            userId,
            onboardingId: onboarding.id,
          },
        });
        accountId = account.id;
        await storage.updateContractorOnboarding(userId, { stripeAccountId: accountId });
      }

      const baseUrl = `https://${process.env.REPLIT_DOMAINS?.split(',')[0]}`;
      const accountLink = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: `${baseUrl}/contractor/onboarding?step=4&refresh=true`,
        return_url: `${baseUrl}/contractor/onboarding?step=4&complete=true`,
        type: "account_onboarding",
      });

      res.json({ url: accountLink.url, accountId });
    } catch (err: unknown) {
      console.error("Stripe Connect error:", err);
      res.status(400).json({ message: (err as Error).message });
    }
  });

  app.get("/api/contractor/onboarding/stripe-status", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const onboarding = await storage.getContractorOnboarding(userId);
      if (!onboarding || !onboarding.stripeAccountId) {
        return res.json({ connected: false, chargesEnabled: false, payoutsEnabled: false });
      }

      const stripe = await getUncachableStripeClient();
      const account = await stripe.accounts.retrieve(onboarding.stripeAccountId);

      const isComplete = account.charges_enabled && account.payouts_enabled;
      if (isComplete && !onboarding.stripeOnboardingComplete) {
        await storage.updateContractorOnboarding(userId, { stripeOnboardingComplete: true });
      }

      res.json({
        connected: true,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        detailsSubmitted: account.details_submitted,
      });
    } catch (err: unknown) {
      res.status(400).json({ message: (err as Error).message });
    }
  });

  app.post("/api/contractor/onboarding/complete", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const profile = await storage.getUserProfile(userId);
      if (!profile || profile.role !== "contractor") {
        return res.status(403).json({ message: "Contractor only" });
      }

      const onboarding = await storage.getContractorOnboarding(userId);
      if (!onboarding) return res.status(404).json({ message: "No onboarding found" });

      if (!onboarding.w9Signed) return res.status(400).json({ message: "W-9 not signed" });

      const existingCleaner = await storage.getCleanerByUserId(userId);
      if (!existingCleaner) {
        await storage.createCleaner({
          name: onboarding.fullName,
          email: onboarding.email,
          phone: onboarding.phone,
          payRate: "25.00",
          status: "active",
          rating: "0",
          onTimePercent: "100",
          serviceArea: onboarding.city + ", " + onboarding.state,
          zipCodes: onboarding.serviceZipCodes || onboarding.zipCode,
          userId,
        });
      }

      await storage.updateContractorOnboarding(userId, { onboardingStatus: "complete" });
      res.json({ success: true });
    } catch (err: unknown) {
      res.status(400).json({ message: (err as Error).message });
    }
  });

  app.get("/api/stripe/publishable-key", async (_req, res) => {
    try {
      const key = await getStripePublishableKey();
      res.json({ publishableKey: key });
    } catch (err: unknown) {
      res.status(500).json({ message: "Stripe not configured" });
    }
  });

  return httpServer;
}
