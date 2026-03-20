import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { isAuthenticated, authStorage } from "./replit_integrations/auth";
import {
  insertClientSchema, insertCleanerSchema, insertJobSchema,
  insertPaymentSchema, insertReviewSchema, insertServiceRequestSchema,
  insertCleanerAvailabilitySchema, insertUserProfileSchema, insertNotificationSchema,
  insertContractorOnboardingSchema, insertContractorApplicationSchema, insertDisputeSchema,
  insertMessageSchema,
} from "@shared/schema";
import { ZodError } from "zod";
import { z } from "zod";
import { calculatePrice, calculateBrokeragePrice, broadcastJobOffers, acceptJobOffer, declineJobOffer, findMatchingCleaners, calculateSurgeMultiplier } from "./matching";
import { getUncachableStripeClient, getStripePublishableKey } from "./stripeClient";
import { sendApplicationApprovedEmail, sendApplicationRejectedEmail } from "./sendgrid";
import { sendToUser, broadcast, broadcastToRole } from "./ws";

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

  // === DEV-ONLY LOGIN SWITCHER (never available in production) ===
  if (process.env.NODE_ENV !== "production") {
    app.get("/api/dev/users", async (_req, res) => {
      const allProfiles = await storage.getAllUserProfiles();
      const users = await Promise.all(
        allProfiles.map(async (p) => {
          const user = await authStorage.getUser(p.userId);
          return {
            id: p.userId,
            name: [user?.firstName, user?.lastName].filter(Boolean).join(" ") || p.userId,
            email: user?.email || "",
            role: p.role,
            approvalStatus: p.approvalStatus,
          };
        })
      );
      res.json(users);
    });

    app.post("/api/dev/login", async (req, res) => {
      const { userId } = req.body;
      if (!userId) return res.status(400).json({ message: "userId required" });
      const user = await authStorage.getUser(userId);
      if (!user) return res.status(404).json({ message: "User not found" });
      const fakeUser = {
        claims: {
          sub: user.id,
          email: user.email || "",
          first_name: user.firstName || "",
          last_name: user.lastName || "",
          exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
        },
        access_token: "dev-token",
        refresh_token: null,
        expires_at: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
      };
      req.login(fakeUser, (err) => {
        if (err) return res.status(500).json({ message: "Login failed", error: String(err) });
        res.json({ ok: true, userId: user.id, role: "switching..." });
      });
    });

    app.post("/api/dev/logout", (req, res) => {
      req.logout(() => {
        req.session.destroy(() => {
          res.json({ ok: true });
        });
      });
    });
  }

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
      if (existing) {
        const { role: _ignoredRole, approvalStatus: _ignored2, ...safeBody } = req.body;
        const updated = await storage.updateUserProfile(userId, safeBody);
        // Sync address/phone changes back to clients table if this is a client
        if (existing.role === "client") {
          const clientRecord = await storage.getClientByUserId(userId);
          if (clientRecord) {
            const patch: Record<string, any> = {};
            if (safeBody.address !== undefined) patch.propertyAddress = safeBody.address;
            if (safeBody.city !== undefined) patch.city = safeBody.city;
            if (safeBody.zipCode !== undefined) patch.zipCode = safeBody.zipCode;
            if (Object.keys(patch).length > 0) await storage.updateClient(clientRecord.id, patch);
          }
        }
        return res.json(updated);
      }
      const allowedRoles = ["client", "contractor"];
      const chosenRole = allowedRoles.includes(req.body.role) ? req.body.role : "client";
      const { role: _ignored, ...rest } = req.body;
      const approvalStatus = chosenRole === "contractor" ? "pending" : "approved";
      const validated = insertUserProfileSchema.parse({ ...rest, userId, role: chosenRole, approvalStatus });
      const profile = await storage.createUserProfile(validated);

      if (chosenRole === "contractor") {
        const allProfiles = await storage.getAllUserProfiles();
        const adminProfiles = allProfiles.filter(p => p.role === "admin");
        const claims = (req as any).user?.claims || {};
        const displayName = claims.name || claims.email || "A new contractor";
        await Promise.all(adminProfiles.map(p =>
          storage.createNotification({
            userId: p.userId,
            title: "New contractor account pending approval",
            message: `${displayName} has signed up as a contractor and is waiting for your approval. Review them in Applications.`,
            type: "contractor_pending",
          })
        ));
      }

      // Auto-create a clients record for client-role users so they appear in admin portal
      if (chosenRole === "client") {
        const authUser = await authStorage.getUser(userId);
        const fullName = [authUser?.firstName, authUser?.lastName].filter(Boolean).join(" ") || authUser?.email || "New Client";
        const existingClient = await storage.getClientByUserId(userId);
        if (!existingClient) {
          await storage.createClient({
            userId,
            name: fullName,
            email: authUser?.email || undefined,
            propertyAddress: (validated as any).address || "Address not provided",
            city: (validated as any).city || undefined,
            zipCode: (validated as any).zipCode || undefined,
            propertyType: "residential",
          });
        }
      }

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

  app.get("/api/pricing-estimate", isAuthenticated, async (req, res) => {
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

  app.get("/api/reviews/mine", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    const reviews = await storage.getReviewsByUserId(userId);
    res.json(reviews);
  });

  app.get("/api/service-requests/:id/tracking", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    const sr = await storage.getServiceRequest(req.params.id);
    if (!sr) return res.status(404).json({ message: "Not found" });
    if (sr.userId !== userId) return res.status(403).json({ message: "Forbidden" });
    if (!sr.jobId) return res.json({ jobStatus: sr.status, propertyAddress: sr.propertyAddress, scheduledDate: sr.requestedDate });

    const job = await storage.getJob(sr.jobId);
    if (!job) return res.status(404).json({ message: "Job not found" });

    let cleanerInfo: Record<string, any> = {};
    if (job.cleanerId) {
      const cleaner = await storage.getCleaner(job.cleanerId);
      if (cleaner) {
        cleanerInfo = {
          cleanerName: cleaner.name,
          cleanerId: cleaner.id,
          cleanerLat: cleaner.currentLat ? Number(cleaner.currentLat) : null,
          cleanerLng: cleaner.currentLng ? Number(cleaner.currentLng) : null,
        };
      }
    }

    res.json({
      jobStatus: job.status,
      jobId: job.id,
      propertyAddress: job.propertyAddress,
      scheduledDate: job.scheduledDate,
      ...cleanerInfo,
    });
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

        const cleaner = await storage.getCleaner(job.cleanerId);
        const stars = "⭐".repeat(review.rating);
        const ratingLabel = review.rating === 5 ? "Excellent" : review.rating === 4 ? "Great" : review.rating === 3 ? "Good" : review.rating === 2 ? "Fair" : "Poor";

        if (cleaner?.userId) {
          await storage.createNotification({
            userId: cleaner.userId,
            title: `New rating: ${stars} (${review.rating}/5)`,
            message: `A client rated your recent cleaning ${review.rating} out of 5 stars. Keep up the great work!`,
            type: "review_received",
            jobId: job.id,
          });
        }

        if (review.rating <= 2) {
          const allProfiles = await storage.getAllUserProfiles();
          const adminProfiles = allProfiles.filter(p => p.role === "admin");
          await Promise.all(adminProfiles.map(p =>
            storage.createNotification({
              userId: p.userId,
              title: `⚠️ Low rating alert: ${review.rating}/5 stars`,
              message: `Job at ${job.propertyAddress} received a ${review.rating}-star review.${review.comment ? ` Client said: "${review.comment}"` : ""} Please review.`,
              type: "low_rating_alert",
              jobId: job.id,
            })
          ));
        }
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
  app.get("/api/clients", isAuthenticated, async (req, res) => {
    if (!(await isAdmin(req))) return res.status(403).json({ message: "Admin only" });
    // Auto-sync: create client records for any client-role users without one
    const allProfiles = await storage.getAllUserProfiles();
    const clientProfiles = allProfiles.filter(p => p.role === "client");
    await Promise.all(clientProfiles.map(async (p) => {
      const existing = await storage.getClientByUserId(p.userId);
      if (!existing) {
        const authUser = await authStorage.getUser(p.userId);
        const fullName = [authUser?.firstName, authUser?.lastName].filter(Boolean).join(" ") || authUser?.email || "Client";
        await storage.createClient({
          userId: p.userId,
          name: fullName,
          email: authUser?.email || undefined,
          propertyAddress: p.address || "Address not provided",
          city: p.city || undefined,
          zipCode: p.zipCode || undefined,
          propertyType: "residential",
        });
      }
    }));
    const allClients = await storage.getClients();
    res.json(allClients);
  });

  app.post("/api/clients", isAuthenticated, async (req, res) => {
    try {
      if (!(await isAdmin(req))) return res.status(403).json({ message: "Admin only" });
      const validated = insertClientSchema.parse(req.body);
      const client = await storage.createClient(validated);
      res.json(client);
    } catch (err: unknown) {
      res.status(400).json({ message: handleZodError(err) });
    }
  });

  app.get("/api/cleaners", isAuthenticated, async (req, res) => {
    if (!(await isAdmin(req))) return res.status(403).json({ message: "Admin only" });
    const allCleaners = await storage.getCleaners();
    res.json(allCleaners);
  });

  app.post("/api/cleaners", isAuthenticated, async (req, res) => {
    try {
      if (!(await isAdmin(req))) return res.status(403).json({ message: "Admin only" });
      const validated = insertCleanerSchema.parse(req.body);
      const cleaner = await storage.createCleaner(validated);
      res.json(cleaner);
    } catch (err: unknown) {
      res.status(400).json({ message: handleZodError(err) });
    }
  });

  app.get("/api/jobs", isAuthenticated, async (req, res) => {
    if (!(await isAdmin(req))) return res.status(403).json({ message: "Admin only" });
    const allJobs = await storage.getJobs();
    res.json(allJobs);
  });

  app.post("/api/jobs", isAuthenticated, async (req, res) => {
    try {
      if (!(await isAdmin(req))) return res.status(403).json({ message: "Admin only" });
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

  app.patch("/api/jobs/:id", isAuthenticated, async (req, res) => {
    try {
      if (!(await isAdmin(req))) return res.status(403).json({ message: "Admin only" });
      const allowedFields = z.object({
        status: z.enum(["pending", "broadcasting", "assigned", "in_progress", "completed", "cancelled"]).optional(),
        scheduledDate: z.coerce.date().optional(),
        notes: z.string().optional(),
        specialInstructions: z.string().optional(),
        startedAt: z.coerce.date().optional(),
        completedAt: z.coerce.date().optional(),
      });
      const safeUpdate = allowedFields.parse(req.body);
      const job = await storage.updateJob(req.params.id, safeUpdate);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }

      if (safeUpdate.status === "completed" && job.cleanerId) {
        const cleaner = await storage.getCleaner(job.cleanerId);
        if (cleaner) {
          await storage.updateCleaner(cleaner.id, {
            totalJobs: (cleaner.totalJobs || 0) + 1,
            totalRevenue: (Number(cleaner.totalRevenue || 0) + Number(job.price)).toFixed(2),
          });
        }

        if (job.serviceRequestId) {
          await storage.updateServiceRequest(job.serviceRequestId, { status: "completed" });
          const sr = await storage.getServiceRequest(job.serviceRequestId);
          if (sr?.userId) {
            await storage.createNotification({
              userId: sr.userId,
              title: "How was your cleaning?",
              message: `Your cleaning at ${job.propertyAddress} is complete. Tap to rate your experience — it only takes a moment.`,
              type: "rate_prompt",
              jobId: job.id,
              serviceRequestId: job.serviceRequestId,
            });
          }
        }
      }

      res.json(job);
    } catch (err: unknown) {
      res.status(400).json({ message: handleZodError(err) });
    }
  });

  app.get("/api/payments", isAuthenticated, async (req, res) => {
    if (!(await isAdmin(req))) return res.status(403).json({ message: "Admin only" });
    const allPayments = await storage.getPayments();
    res.json(allPayments);
  });

  app.get("/api/reviews", isAuthenticated, async (req, res) => {
    if (!(await isAdmin(req))) return res.status(403).json({ message: "Admin only" });
    const allReviews = await storage.getReviews();
    res.json(allReviews);
  });

  app.post("/api/reviews", isAuthenticated, async (req, res) => {
    try {
      if (!(await isAdmin(req))) return res.status(403).json({ message: "Admin only" });
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

      const safeUpdate = z.object({
        status: z.enum(["pending", "broadcasting", "matching", "confirmed", "in_progress", "completed", "cancelled"]).optional(),
        specialInstructions: z.string().optional(),
      }).parse(req.body);
      const updated = await storage.updateServiceRequest(req.params.id, safeUpdate);
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

  app.get("/api/contractor/reviews", isAuthenticated, async (req, res) => {
    const contractor = await isContractor(req);
    if (!contractor) return res.status(403).json({ message: "Contractor only" });
    const userId = getUserId(req);
    const cleaner = await storage.getCleanerByUserId(userId);
    if (!cleaner) return res.status(404).json({ message: "No contractor profile linked" });
    const cleanerReviews = await storage.getReviewsByCleanerId(cleaner.id);
    res.json(cleanerReviews);
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
      if (!["in_route", "in_progress", "completed"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      const updated = await storage.updateJob(job.id, { status });

      if (status === "in_route" && job.serviceRequestId) {
        const sr = await storage.getServiceRequest(job.serviceRequestId);
        if (sr?.userId) {
          await storage.createNotification({
            userId: sr.userId,
            title: "Your cleaner is on the way! 🚗",
            message: `Your cleaner is heading to ${job.propertyAddress}. Open your app to track them live.`,
            type: "cleaner_in_route",
            jobId: job.id,
            serviceRequestId: job.serviceRequestId,
          });
          sendToUser(sr.userId, { type: "job_status_update", jobId: job.id, status: "in_route", serviceRequestId: job.serviceRequestId });
        }
        await storage.updateServiceRequest(job.serviceRequestId, { status: "in_route" });
      }

      if (status === "completed") {
        await storage.updateCleaner(cleaner.id, {
          totalJobs: (cleaner.totalJobs || 0) + 1,
          totalRevenue: (Number(cleaner.totalRevenue || 0) + Number(job.price)).toFixed(2),
        });
        if (job.serviceRequestId) {
          await storage.updateServiceRequest(job.serviceRequestId, { status: "completed" });
          const sr = await storage.getServiceRequest(job.serviceRequestId);
          if (sr?.userId) {
            await storage.createNotification({
              userId: sr.userId,
              title: "How was your cleaning?",
              message: `Your cleaning at ${job.propertyAddress} is complete. Tap to rate your experience — it only takes a moment.`,
              type: "rate_prompt",
              jobId: job.id,
              serviceRequestId: job.serviceRequestId,
            });
          }
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
  app.get("/api/dashboard/stats", isAuthenticated, async (req, res) => {
    if (!(await isAdmin(req))) return res.status(403).json({ message: "Admin only" });
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
  app.get("/api/calendar", isAuthenticated, async (req, res) => {
    if (!(await isAdmin(req))) return res.status(403).json({ message: "Admin only" });
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
        const validated = insertContractorOnboardingSchema.partial().parse(req.body);
        const updated = await storage.updateContractorOnboarding(userId, validated);
        return res.json(updated);
      }

      const validated = insertContractorOnboardingSchema.parse({ ...req.body, userId });
      const onboarding = await storage.createContractorOnboarding(validated);
      res.json(onboarding);
    } catch (err: unknown) {
      res.status(400).json({ message: handleZodError(err) });
    }
  });

  app.post("/api/contractor/onboarding/agreement", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const profile = await storage.getUserProfile(userId);
      if (!profile || profile.role !== "contractor") {
        return res.status(403).json({ message: "Contractor only" });
      }

      const { signatureName, agreed } = req.body;
      if (agreed === false) {
        const updated = await storage.updateContractorOnboarding(userId, {
          agreementDeclined: true,
          agreementSigned: false,
        });
        if (!updated) return res.status(404).json({ message: "Onboarding record not found. Complete Step 1 first." });
        return res.json(updated);
      }

      if (!signatureName) return res.status(400).json({ message: "Signature name required" });

      const updated = await storage.updateContractorOnboarding(userId, {
        agreementSigned: true,
        agreementSignedAt: new Date(),
        agreementSignatureName: signatureName,
        agreementDeclined: false,
      });
      if (!updated) return res.status(404).json({ message: "Onboarding record not found. Complete Step 1 first." });
      res.json(updated);
    } catch (err: unknown) {
      res.status(400).json({ message: (err as Error).message });
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
        refresh_url: `${baseUrl}/contractor/onboarding?step=5&refresh=true`,
        return_url: `${baseUrl}/contractor/onboarding?step=5&complete=true`,
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

      if (!onboarding.agreementSigned) return res.status(400).json({ message: "Subcontractor agreement not signed" });
      if (!onboarding.w9Signed) return res.status(400).json({ message: "W-9 not signed" });

      const existingCleaner = await storage.getCleanerByUserId(userId);
      if (!existingCleaner) {
        await storage.createCleaner({
          name: onboarding.fullName,
          email: onboarding.email,
          phone: onboarding.phone,
          payRate: 70,
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

  // === CONTRACTOR PAYOUTS ===
  app.get("/api/contractor/payouts", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const profile = await storage.getUserProfile(userId);
      if (!profile || profile.role !== "contractor") return res.status(403).json({ message: "Contractor only" });

      const cleaner = await storage.getCleanerByUserId(userId);
      const onboarding = await storage.getContractorOnboarding(userId);

      let stripeStatus = { connected: false, chargesEnabled: false, payoutsEnabled: false, detailsSubmitted: false, balance: null as any };

      if (onboarding?.stripeAccountId) {
        try {
          const stripe = await getUncachableStripeClient();
          const account = await stripe.accounts.retrieve(onboarding.stripeAccountId);
          const balance = account.charges_enabled ? await stripe.balance.retrieve({ stripeAccount: onboarding.stripeAccountId }) : null;
          stripeStatus = {
            connected: true,
            chargesEnabled: account.charges_enabled ?? false,
            payoutsEnabled: account.payouts_enabled ?? false,
            detailsSubmitted: account.details_submitted ?? false,
            balance,
          };
        } catch (stripeErr: unknown) {
          console.error("[Stripe] Failed to fetch account/balance details:", (stripeErr as Error).message);
        }
      }

      const jobs = cleaner ? await storage.getJobsByCleanerId(cleaner.id) : [];
      const payoutHistory = jobs
        .filter(j => j.status === "completed" && j.cleanerPay)
        .map(j => ({
          jobId: j.id,
          propertyAddress: j.propertyAddress,
          scheduledDate: j.scheduledDate,
          clientTotal: Number(j.price),
          cleanSlateMargin: Number(j.profit || 0),
          yourPayout: Number(j.cleanerPay),
          marginPercent: j.price && j.profit ? Math.round((Number(j.profit) / Number(j.price)) * 100) : 30,
          status: "paid",
        }))
        .sort((a, b) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime());

      const totalEarned = payoutHistory.reduce((sum, p) => sum + p.yourPayout, 0);
      const totalClientRevenue = payoutHistory.reduce((sum, p) => sum + p.clientTotal, 0);

      res.json({
        stripeStatus,
        payoutHistory,
        summary: {
          totalEarned,
          totalClientRevenue,
          totalJobs: payoutHistory.length,
          avgMarginPercent: 30,
        },
        stripeAccountId: onboarding?.stripeAccountId || null,
      });
    } catch (err: unknown) {
      res.status(400).json({ message: (err as Error).message });
    }
  });

  app.post("/api/contractor/payouts/connect", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const profile = await storage.getUserProfile(userId);
      if (!profile || profile.role !== "contractor") return res.status(403).json({ message: "Contractor only" });

      const onboarding = await storage.getContractorOnboarding(userId);
      if (!onboarding) return res.status(400).json({ message: "Complete onboarding first" });

      const stripe = await getUncachableStripeClient();
      let accountId = onboarding.stripeAccountId;

      if (!accountId) {
        const account = await stripe.accounts.create({
          type: "express",
          country: "US",
          email: onboarding.email,
          capabilities: { transfers: { requested: true } },
          business_type: "individual",
          metadata: { userId, onboardingId: onboarding.id },
        });
        accountId = account.id;
        await storage.updateContractorOnboarding(userId, { stripeAccountId: accountId });
      }

      const baseUrl = `https://${process.env.REPLIT_DOMAINS?.split(',')[0]}`;
      const accountLink = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: `${baseUrl}/contractor/payouts`,
        return_url: `${baseUrl}/contractor/payouts?connected=true`,
        type: "account_onboarding",
      });

      res.json({ url: accountLink.url });
    } catch (err: unknown) {
      res.status(400).json({ message: (err as Error).message });
    }
  });

  app.get("/api/contractor/payouts/dashboard-link", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const onboarding = await storage.getContractorOnboarding(userId);
      if (!onboarding?.stripeAccountId) return res.status(400).json({ message: "No Stripe account connected" });

      const stripe = await getUncachableStripeClient();
      const loginLink = await stripe.accounts.createLoginLink(onboarding.stripeAccountId);
      res.json({ url: loginLink.url });
    } catch (err: unknown) {
      res.status(400).json({ message: (err as Error).message });
    }
  });

  // === CONTRACTOR APPLICATIONS (PUBLIC) ===
  app.post("/api/contractor-applications", async (req, res) => {
    try {
      const validated = insertContractorApplicationSchema.parse(req.body);
      const existing = await storage.getContractorApplicationByEmail(validated.email);
      if (existing && existing.status === "pending") {
        return res.status(400).json({ message: "An application with this email is already pending review." });
      }
      const application = await storage.createContractorApplication(validated);
      res.json(application);
    } catch (err: unknown) {
      res.status(400).json({ message: handleZodError(err) });
    }
  });

  // === ADMIN: PENDING CONTRACTOR ACCOUNTS ===
  app.get("/api/admin/pending-contractors", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    const profile = await storage.getUserProfile(userId);
    if (!profile || profile.role !== "admin") return res.status(403).json({ message: "Admin only" });
    const all = await storage.getAllUserProfiles();
    const pending = all.filter(p => p.role === "contractor" && p.approvalStatus !== "approved");
    res.json(pending);
  });

  app.post("/api/admin/pending-contractors/:targetUserId/approve", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const profile = await storage.getUserProfile(userId);
      if (!profile || profile.role !== "admin") return res.status(403).json({ message: "Admin only" });
      const { targetUserId } = req.params;
      const updated = await storage.updateUserProfile(targetUserId, { approvalStatus: "approved" });
      if (!updated) return res.status(404).json({ message: "User not found" });
      try {
        const onboarding = await storage.getContractorOnboarding(targetUserId);
        if (onboarding?.email) {
          await sendApplicationApprovedEmail(onboarding.email, onboarding.fullName);
        }
      } catch (emailErr: unknown) {
        console.error("[SendGrid] Failed to send approval email:", (emailErr as Error).message);
      }
      res.json({ success: true, profile: updated });
    } catch (err: unknown) {
      res.status(400).json({ message: (err as Error).message });
    }
  });

  app.post("/api/admin/pending-contractors/:targetUserId/reject", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const profile = await storage.getUserProfile(userId);
      if (!profile || profile.role !== "admin") return res.status(403).json({ message: "Admin only" });
      const { targetUserId } = req.params;
      const { reason } = req.body;
      const updated = await storage.updateUserProfile(targetUserId, { approvalStatus: "rejected" });
      if (!updated) return res.status(404).json({ message: "User not found" });
      try {
        const onboarding = await storage.getContractorOnboarding(targetUserId);
        if (onboarding?.email) {
          await sendApplicationRejectedEmail(onboarding.email, onboarding.fullName, reason || "We are unable to approve your application at this time.");
        }
      } catch (emailErr: unknown) {
        console.error("[SendGrid] Failed to send rejection email:", (emailErr as Error).message);
      }
      res.json({ success: true, profile: updated });
    } catch (err: unknown) {
      res.status(400).json({ message: (err as Error).message });
    }
  });

  // === ADMIN: CONTRACTOR APPLICATIONS ===
  app.get("/api/admin/contractor-applications", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    const profile = await storage.getUserProfile(userId);
    if (!profile || profile.role !== "admin") return res.status(403).json({ message: "Admin only" });
    const applications = await storage.getContractorApplications();
    res.json(applications);
  });

  app.patch("/api/admin/contractor-applications/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const profile = await storage.getUserProfile(userId);
      if (!profile || profile.role !== "admin") return res.status(403).json({ message: "Admin only" });

      const { id } = req.params;
      const { status, adminNote } = req.body;
      const application = await storage.getContractorApplication(id);
      if (!application) return res.status(404).json({ message: "Application not found" });

      const updated = await storage.updateContractorApplication(id, {
        status,
        adminNote,
        reviewedAt: new Date(),
      });

      if (status === "approved") {
        await sendApplicationApprovedEmail(application.email, application.firstName);
      } else if (status === "rejected") {
        await sendApplicationRejectedEmail(application.email, application.firstName, adminNote);
      }

      res.json(updated);
    } catch (err: unknown) {
      res.status(400).json({ message: (err as Error).message });
    }
  });

  // === ADMIN: REVIEW MODERATION ===
  app.get("/api/admin/reviews", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    const profile = await storage.getUserProfile(userId);
    if (!profile || profile.role !== "admin") return res.status(403).json({ message: "Admin only" });
    const allReviews = await storage.getReviews();
    const [allClients, allCleaners, allJobs] = await Promise.all([
      storage.getClients(),
      storage.getCleaners(),
      storage.getJobs(),
    ]);
    const enriched = allReviews.map(r => ({
      ...r,
      clientName: allClients.find(c => c.id === r.clientId)?.name || null,
      cleanerName: allCleaners.find(c => c.id === r.cleanerId)?.name || null,
      jobAddress: allJobs.find(j => j.id === r.jobId)?.propertyAddress || null,
    }));
    res.json(enriched);
  });

  app.patch("/api/admin/reviews/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const profile = await storage.getUserProfile(userId);
      if (!profile || profile.role !== "admin") return res.status(403).json({ message: "Admin only" });

      const { id } = req.params;
      const { moderationStatus, adminNote, comment, rating } = req.body;
      const updated = await storage.updateReview(id, { moderationStatus, adminNote, comment, rating });
      if (!updated) return res.status(404).json({ message: "Review not found" });
      res.json(updated);
    } catch (err: unknown) {
      res.status(400).json({ message: (err as Error).message });
    }
  });

  // === ADMIN: CONTRACTOR STATUS MANAGEMENT ===
  app.patch("/api/admin/cleaners/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const profile = await storage.getUserProfile(userId);
      if (!profile || profile.role !== "admin") return res.status(403).json({ message: "Admin only" });

      const { id } = req.params;
      const { status, statusNote, isFeatured, adminNote } = req.body;
      const updated = await storage.updateCleaner(id, { status, statusNote, isFeatured, adminNote });
      if (!updated) return res.status(404).json({ message: "Cleaner not found" });
      res.json(updated);
    } catch (err: unknown) {
      res.status(400).json({ message: (err as Error).message });
    }
  });

  // === ADMIN: CLIENT MANAGEMENT ===
  app.patch("/api/admin/clients/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const profile = await storage.getUserProfile(userId);
      if (!profile || profile.role !== "admin") return res.status(403).json({ message: "Admin only" });

      const { id } = req.params;
      const { isActive, isVip, adminNote } = req.body;
      const updated = await storage.updateClient(id, { isActive, isVip, adminNote });
      if (!updated) return res.status(404).json({ message: "Client not found" });
      res.json(updated);
    } catch (err: unknown) {
      res.status(400).json({ message: (err as Error).message });
    }
  });

  // === ADMIN: DISPUTES ===
  app.get("/api/admin/disputes", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    const profile = await storage.getUserProfile(userId);
    if (!profile || profile.role !== "admin") return res.status(403).json({ message: "Admin only" });
    const allDisputes = await storage.getDisputes();
    res.json(allDisputes);
  });

  app.post("/api/admin/disputes", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const profile = await storage.getUserProfile(userId);
      if (!profile || profile.role !== "admin") return res.status(403).json({ message: "Admin only" });

      const validated = insertDisputeSchema.parse({ ...req.body, reportedByUserId: userId });
      const dispute = await storage.createDispute(validated);
      res.json(dispute);
    } catch (err: unknown) {
      res.status(400).json({ message: handleZodError(err) });
    }
  });

  app.patch("/api/admin/disputes/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const profile = await storage.getUserProfile(userId);
      if (!profile || profile.role !== "admin") return res.status(403).json({ message: "Admin only" });

      const { id } = req.params;
      const { status, adminNote, resolutionNote } = req.body;
      const resolvedAt = status === "resolved" ? new Date() : undefined;
      const updated = await storage.updateDispute(id, { status, adminNote, resolutionNote, ...(resolvedAt ? { resolvedAt } : {}) });
      if (!updated) return res.status(404).json({ message: "Dispute not found" });
      res.json(updated);
    } catch (err: unknown) {
      res.status(400).json({ message: (err as Error).message });
    }
  });

  // === ADMIN: BULK NOTIFICATIONS ===
  app.post("/api/admin/notifications/broadcast", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const profile = await storage.getUserProfile(userId);
      if (!profile || profile.role !== "admin") return res.status(403).json({ message: "Admin only" });

      const { title, message, targetRole } = req.body;
      if (!title || !message || !targetRole) {
        return res.status(400).json({ message: "title, message, and targetRole are required" });
      }

      const allProfiles = await storage.getAllUserProfiles();
      const targets = allProfiles.filter(p => p.role === targetRole);
      const created = await Promise.all(targets.map(p =>
        storage.createNotification({ userId: p.userId, title, message, type: "broadcast" })
      ));
      res.json({ sent: created.length });
    } catch (err: unknown) {
      res.status(400).json({ message: (err as Error).message });
    }
  });

  // === ADMIN: CONTRACTOR ALERTS ===
  app.get("/api/admin/alerts", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    const profile = await storage.getUserProfile(userId);
    if (!profile || profile.role !== "admin") return res.status(403).json({ message: "Admin only" });

    const allCleaners = await storage.getCleaners();
    const atRisk = allCleaners.filter(c => {
      const rating = Number(c.rating);
      return c.status === "active" && rating > 0 && rating < 4.0;
    });
    res.json({ atRisk });
  });

  // === CLIENT: REVIEW CLIENT HISTORY (ADMIN) ===
  app.get("/api/admin/client-reviews/:clientId", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    const profile = await storage.getUserProfile(userId);
    if (!profile || profile.role !== "admin") return res.status(403).json({ message: "Admin only" });
    const allReviews = await storage.getReviews();
    const filtered = allReviews.filter(r => r.clientId === req.params.clientId);
    res.json(filtered);
  });

  // === CONTRACTOR: GO ONLINE / OFFLINE ===
  app.patch("/api/contractor/online-status", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const profile = await storage.getUserProfile(userId);
      if (!profile || profile.role !== "contractor") return res.status(403).json({ message: "Contractor only" });

      const cleaner = await storage.getCleanerByUserId(userId);
      if (!cleaner) return res.status(404).json({ message: "Cleaner profile not found" });

      const { isOnline, lat, lng } = req.body;
      const updated = await storage.updateCleanerOnlineStatus(cleaner.id, isOnline, lat, lng);

      broadcast({
        type: isOnline ? "cleaner_online" : "cleaner_offline",
        cleanerId: cleaner.id,
        cleanerName: cleaner.name,
        lat,
        lng,
      });

      res.json(updated);
    } catch (err: unknown) {
      res.status(500).json({ message: (err as Error).message });
    }
  });

  // === CONTRACTOR: GET ONLINE STATUS ===
  app.get("/api/contractor/online-status", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const cleaner = await storage.getCleanerByUserId(userId);
      if (!cleaner) return res.status(404).json({ message: "Cleaner not found" });
      res.json({ isOnline: cleaner.isOnline, currentLat: cleaner.currentLat, currentLng: cleaner.currentLng });
    } catch (err: unknown) {
      res.status(500).json({ message: (err as Error).message });
    }
  });

  // === ADMIN: GET ALL ONLINE CLEANERS (FOR MAP) ===
  app.get("/api/admin/online-cleaners", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const profile = await storage.getUserProfile(userId);
      if (!profile || profile.role !== "admin") return res.status(403).json({ message: "Admin only" });
      const onlineCleaners = await storage.getOnlineCleaners();
      res.json(onlineCleaners);
    } catch (err: unknown) {
      res.status(500).json({ message: (err as Error).message });
    }
  });

  // === MESSAGES: GET MESSAGES FOR A JOB ===
  app.get("/api/messages/:jobId", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const profile = await storage.getUserProfile(userId);
      if (!profile) return res.status(403).json({ message: "Not authorized" });
      const msgs = await storage.getMessagesByJobId(req.params.jobId);
      res.json(msgs);
    } catch (err: unknown) {
      res.status(500).json({ message: (err as Error).message });
    }
  });

  // === MESSAGES: SEND A MESSAGE ===
  app.post("/api/messages", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const profile = await storage.getUserProfile(userId);
      if (!profile) return res.status(403).json({ message: "Not authorized" });

      const parsed = insertMessageSchema.parse(req.body);
      parsed.senderId = userId;

      const message = await storage.createMessage(parsed);

      broadcast({
        type: "new_message",
        jobId: message.jobId,
        message,
      });

      res.json(message);
    } catch (err: unknown) {
      res.status(400).json({ message: handleZodError(err) });
    }
  });

  // === CONTRACTOR: RATE CLIENT AFTER JOB ===
  app.post("/api/contractor/jobs/:jobId/rate-client", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const profile = await storage.getUserProfile(userId);
      if (!profile || profile.role !== "contractor") return res.status(403).json({ message: "Contractor only" });

      const cleaner = await storage.getCleanerByUserId(userId);
      if (!cleaner) return res.status(404).json({ message: "Cleaner not found" });

      const job = await storage.getJob(req.params.jobId);
      if (!job) return res.status(404).json({ message: "Job not found" });
      if (job.cleanerId !== cleaner.id) return res.status(403).json({ message: "Not your job" });

      const { rating, note } = z.object({ rating: z.number().min(1).max(5), note: z.string().optional().default("") }).parse(req.body);
      const updated = await storage.rateClientForJob(job.id, rating, note);

      const serviceReqs = await storage.getServiceRequests();
      const sr = serviceReqs.find(s => s.jobId === job.id || s.id === job.serviceRequestId);
      if (sr) {
        const clientRecord = await storage.getClientByUserId(sr.userId);
        if (clientRecord) {
          const count = (clientRecord.clientRatingCount || 0) + 1;
          const prevRating = Number(clientRecord.clientRating || 5);
          const newRating = ((prevRating * (count - 1)) + rating) / count;
          await storage.updateClient(clientRecord.id, {
            clientRating: newRating.toFixed(2),
            clientRatingCount: count,
          });
        }
      }

      res.json(updated);
    } catch (err: unknown) {
      res.status(400).json({ message: handleZodError(err) });
    }
  });

  // === AI USAGE STATS ===
  app.get("/api/admin/ai-usage/stats", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const profile = await storage.getUserProfile(userId);
      if (!profile || profile.role !== "admin") return res.status(403).json({ message: "Admin only" });
      const stats = await storage.getAiUsageStats();
      res.json(stats);
    } catch (err: unknown) {
      res.status(500).json({ message: (err as Error).message });
    }
  });

  app.get("/api/admin/ai-usage/logs", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const profile = await storage.getUserProfile(userId);
      if (!profile || profile.role !== "admin") return res.status(403).json({ message: "Admin only" });
      const logs = await storage.getAiUsageLogs(50);
      res.json(logs);
    } catch (err: unknown) {
      res.status(500).json({ message: (err as Error).message });
    }
  });

  // === SURGE PRICING ===
  app.get("/api/surge", async (req, res) => {
    try {
      const onlineCleaners = await storage.getOnlineCleaners();
      const allRequests = await storage.getServiceRequests();
      const activeRequests = allRequests.filter(r => ["pending", "broadcasting", "matching"].includes(r.status));
      const multiplier = calculateSurgeMultiplier(onlineCleaners.length, activeRequests.length);
      res.json({ multiplier, onlineCount: onlineCleaners.length, activeRequests: activeRequests.length });
    } catch (err: unknown) {
      res.status(500).json({ message: (err as Error).message });
    }
  });

  return httpServer;
}
