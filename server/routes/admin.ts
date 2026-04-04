import { type Express } from "express";
import { storage } from "../storage";
import { isAuthenticated, authStorage } from "../replit_integrations/auth";
import {
  insertClientSchema, insertCleanerSchema, insertJobSchema,
  insertReviewSchema, insertCleanerAvailabilitySchema, insertDisputeSchema,
} from "@shared/schema";
import { broadcastJobOffers } from "../matching";
import { z } from "zod";
import { getUserId, isAdmin, handleZodError } from "./helpers";

export function registerAdminRoutes(app: Express) {
  // === ADMIN ROUTES ===
  app.get("/api/clients", isAuthenticated, async (req, res) => {
    if (!(await isAdmin(req))) return res.status(403).json({ message: "Admin only" });
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

  app.get("/api/admin/clients/:id", isAuthenticated, async (req, res) => {
    if (!(await isAdmin(req))) return res.status(403).json({ message: "Admin only" });
    const client = await storage.getClient(req.params.id);
    if (!client) return res.status(404).json({ message: "Client not found" });
    const serviceRequests = client.userId
      ? await storage.getServiceRequestsByUserId(client.userId)
      : [];
    const jobs = await storage.getJobsByClientId(client.id);
    res.json({ client, serviceRequests, jobs });
  });

  app.get("/api/admin/cleaners/:id", isAuthenticated, async (req, res) => {
    if (!(await isAdmin(req))) return res.status(403).json({ message: "Admin only" });
    const cleaner = await storage.getCleaner(req.params.id);
    if (!cleaner) return res.status(404).json({ message: "Cleaner not found" });
    const jobs = await storage.getJobsByCleanerId(cleaner.id);
    res.json({ cleaner, jobs });
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
      const safeUpdate = z.object({
        status: z.enum(["pending", "broadcasting", "assigned", "in_route", "in_progress", "completed", "cancelled"]).optional(),
        scheduledDate: z.coerce.date().optional(),
        notes: z.string().max(2000).nullable().optional(),
        specialInstructions: z.string().max(2000).nullable().optional(),
        startedAt: z.coerce.date().nullable().optional(),
        completedAt: z.coerce.date().nullable().optional(),
      }).strict().parse(req.body);
      const job = await storage.updateJob(req.params.id, safeUpdate);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }

      if (safeUpdate.status === "completed" && job.cleanerId) {
        const cleaner = await storage.getCleaner(job.cleanerId);
        if (cleaner) {
          await storage.updateCleaner(cleaner.id, {
            totalJobs: (cleaner.totalJobs || 0) + 1,
            totalRevenue: (Number(cleaner.totalRevenue || 0) + Number(job.cleanerPay || 0)).toFixed(2),
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

      const bodySchema = z.union([
        z.object({
          assignedCleanerId: z.string().min(1),
          status: z.literal("confirmed"),
        }).strict(),
        z.object({
          status: z.enum(["pending", "broadcasting", "matching", "confirmed", "in_route", "in_progress", "completed", "cancelled"]).optional(),
          specialInstructions: z.string().max(2000).optional(),
        }).strict(),
      ]);
      const body = bodySchema.parse(req.body);

      if ("assignedCleanerId" in body && body.assignedCleanerId && body.status === "confirmed") {
        const cleaner = await storage.getCleaner(body.assignedCleanerId);
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
          cleanerId: body.assignedCleanerId,
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
          assignedCleanerId: body.assignedCleanerId,
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

      const { status, specialInstructions } = body as { assignedCleanerId?: undefined; status?: string; specialInstructions?: string };
      const updated = await storage.updateServiceRequest(req.params.id, {
        ...(status !== undefined && { status }),
        ...(specialInstructions !== undefined && { specialInstructions }),
      });
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

  // === CLEANER AVAILABILITY (Admin-managed) ===
  app.get("/api/cleaner-availability/:cleanerId", isAuthenticated, async (req, res) => {
    const availability = await storage.getCleanerAvailability(req.params.cleanerId);
    res.json(availability);
  });

  app.post("/api/cleaner-availability/:cleanerId", isAuthenticated, async (req, res) => {
    try {
      const admin = await isAdmin(req);
      if (!admin) return res.status(403).json({ message: "Admin only" });

      const { slots } = z.object({ slots: z.array(z.record(z.unknown())).default([]) })
        .parse(req.body);

      await storage.deleteCleanerAvailability(req.params.cleanerId);

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

      const body = z.object({
        moderationStatus: z.enum(["approved", "hidden", "pending"]).optional(),
        adminNote: z.string().max(2000).optional(),
        comment: z.string().max(5000).optional(),
        rating: z.number().int().min(1).max(5).optional(),
      }).strict().parse(req.body);

      const { id } = req.params;
      const updated = await storage.updateReview(id, body);
      if (!updated) return res.status(404).json({ message: "Review not found" });
      res.json(updated);
    } catch (err: unknown) {
      res.status(400).json({ message: handleZodError(err) });
    }
  });

  // === ADMIN: CONTRACTOR STATUS MANAGEMENT ===
  app.patch("/api/admin/cleaners/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const profile = await storage.getUserProfile(userId);
      if (!profile || profile.role !== "admin") return res.status(403).json({ message: "Admin only" });

      const body = z.object({
        status: z.enum(["active", "inactive", "suspended"]).optional(),
        statusNote: z.string().max(500).nullable().optional(),
        isFeatured: z.boolean().optional(),
        adminNote: z.string().max(2000).nullable().optional(),
      }).strict().parse(req.body);

      const { id } = req.params;
      const updated = await storage.updateCleaner(id, body);
      if (!updated) return res.status(404).json({ message: "Cleaner not found" });
      res.json(updated);
    } catch (err: unknown) {
      res.status(400).json({ message: handleZodError(err) });
    }
  });

  // === ADMIN: CLIENT MANAGEMENT ===
  app.patch("/api/admin/clients/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const profile = await storage.getUserProfile(userId);
      if (!profile || profile.role !== "admin") return res.status(403).json({ message: "Admin only" });

      const body = z.object({
        isActive: z.boolean().optional(),
        isVip: z.boolean().optional(),
        adminNote: z.string().max(2000).nullable().optional(),
      }).strict().parse(req.body);

      const { id } = req.params;
      const updated = await storage.updateClient(id, body);
      if (!updated) return res.status(404).json({ message: "Client not found" });
      res.json(updated);
    } catch (err: unknown) {
      res.status(400).json({ message: handleZodError(err) });
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

      const body = z.object({
        status: z.enum(["open", "investigating", "resolved"]).optional(),
        adminNote: z.string().max(2000).nullable().optional(),
        resolutionNote: z.string().max(5000).nullable().optional(),
      }).strict().parse(req.body);

      const { id } = req.params;
      const resolvedAt = body.status === "resolved" ? new Date() : undefined;
      const updated = await storage.updateDispute(id, {
        ...body,
        ...(resolvedAt ? { resolvedAt } : {}),
      });
      if (!updated) return res.status(404).json({ message: "Dispute not found" });
      res.json(updated);
    } catch (err: unknown) {
      res.status(400).json({ message: handleZodError(err) });
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

  // === ADMIN: CLIENT REVIEW HISTORY ===
  app.get("/api/admin/client-reviews/:clientId", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    const profile = await storage.getUserProfile(userId);
    if (!profile || profile.role !== "admin") return res.status(403).json({ message: "Admin only" });
    const allReviews = await storage.getReviews();
    const filtered = allReviews.filter(r => r.clientId === req.params.clientId);
    res.json(filtered);
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
          const { sendApplicationApprovedEmail } = await import("../sendgrid");
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
          const { sendApplicationRejectedEmail } = await import("../sendgrid");
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

      const body = z.object({
        status: z.enum(["pending", "approved", "rejected", "waitlisted"]),
        adminNote: z.string().max(2000).optional(),
      }).strict().parse(req.body);

      const { id } = req.params;
      const application = await storage.getContractorApplication(id);
      if (!application) return res.status(404).json({ message: "Application not found" });

      const updated = await storage.updateContractorApplication(id, {
        status: body.status,
        adminNote: body.adminNote,
        reviewedAt: new Date(),
      });

      const { sendApplicationApprovedEmail, sendApplicationRejectedEmail } = await import("../sendgrid");
      if (body.status === "approved") {
        await sendApplicationApprovedEmail(application.email, application.firstName);
      } else if (body.status === "rejected") {
        await sendApplicationRejectedEmail(application.email, application.firstName, body.adminNote);
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
}
