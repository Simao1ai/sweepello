import express, { type Express } from "express";
import { storage } from "../storage";
import { isAuthenticated, authStorage } from "../replit_integrations/auth";
import { insertMessageSchema, insertRecurringBookingSchema } from "@shared/schema";
import { calculateBrokeragePrice, calculateSurgeMultiplier } from "../matching";
import { getUncachableStripeClient } from "../stripeClient";
import { sendRecurringBookingCreatedEmail, sendTipReceivedEmail } from "../sendgrid";
import { sendToUser, broadcast } from "../ws";
import path from "path";
import fs from "fs";
import { z } from "zod";
import { getUserId, isAdmin, isAuthorizedForJob, handleZodError, upload, uploadDir } from "./helpers";

export function registerPlatformRoutes(app: Express) {
  // Serve uploaded job photos
  app.use("/uploads", express.static(uploadDir));

  // === NOTIFICATION ROUTES ===
  app.get("/api/notifications", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    const notifs = await storage.getNotificationsByUserId(userId);
    const enriched = await Promise.all(notifs.map(async (n) => {
      if (n.type === "job_offer" && n.jobOfferId) {
        const offer = await storage.getJobOffer(n.jobOfferId);
        return { ...n, offerStatus: offer?.status ?? "expired" };
      }
      return { ...n, offerStatus: null };
    }));
    res.json(enriched);
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

  // === MESSAGES ===
  app.get("/api/messages/:jobId", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const profile = await storage.getUserProfile(userId);
      if (!profile) return res.status(403).json({ message: "Not authorized" });

      const job = await storage.getJob(req.params.jobId);
      if (!job) return res.status(404).json({ message: "Job not found" });

      const authorized = await isAuthorizedForJob(job, userId, profile.role);
      if (!authorized) return res.status(403).json({ message: "You are not authorized to view messages for this job" });

      const msgs = await storage.getMessagesByJobId(req.params.jobId);
      res.json(msgs);
    } catch (err: unknown) {
      res.status(500).json({ message: (err as Error).message });
    }
  });

  app.post("/api/messages", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const profile = await storage.getUserProfile(userId);
      if (!profile) return res.status(403).json({ message: "Not authorized" });

      const { jobId } = req.body;
      if (!jobId) return res.status(400).json({ message: "jobId is required" });

      const job = await storage.getJob(jobId);
      if (!job) return res.status(404).json({ message: "Job not found" });

      const authorized = await isAuthorizedForJob(job, userId, profile.role);
      if (!authorized) return res.status(403).json({ message: "You are not authorized to send messages for this job" });

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

  // === RECURRING BOOKINGS ===
  app.get("/api/recurring-bookings", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const admin = await isAdmin(req);
      const bookings = admin
        ? await storage.getAllRecurringBookings()
        : await storage.getRecurringBookingsByUserId(userId);
      res.json(bookings);
    } catch (err: unknown) {
      res.status(500).json({ message: (err as Error).message });
    }
  });

  app.post("/api/recurring-bookings", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const validated = insertRecurringBookingSchema.parse({ ...req.body, userId });

      const pricing = calculateBrokeragePrice(
        validated.serviceType || "standard",
        validated.bedrooms || 2,
        validated.bathrooms || 1,
        validated.squareFootage || 1000,
        validated.basement || false
      );

      let nextServiceDate: Date | undefined;
      if (validated.dayOfWeek !== undefined && validated.dayOfWeek !== null) {
        const today = new Date();
        const daysUntil = (validated.dayOfWeek - today.getDay() + 7) % 7 || 7;
        nextServiceDate = new Date(today);
        nextServiceDate.setDate(today.getDate() + daysUntil);
      }

      const rb = await storage.createRecurringBooking({
        ...validated,
        estimatedPrice: String(pricing.clientPrice),
        nextServiceDate,
      } as any);

      const authUser = await authStorage.getUser(userId);
      if (authUser?.email) {
        sendRecurringBookingCreatedEmail(
          authUser.email,
          authUser.firstName || "Client",
          validated.propertyAddress,
          validated.frequency,
          nextServiceDate ? nextServiceDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }) : "TBD",
          `$${pricing.clientPrice.toFixed(0)}`
        ).catch(() => {});
      }

      res.json(rb);
    } catch (err: unknown) {
      res.status(400).json({ message: handleZodError(err) });
    }
  });

  app.patch("/api/recurring-bookings/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const rb = await storage.getRecurringBooking(req.params.id);
      if (!rb) return res.status(404).json({ message: "Recurring booking not found" });
      const admin = await isAdmin(req);
      if (rb.userId !== userId && !admin) return res.status(403).json({ message: "Not your booking" });

      const { isActive, frequency, dayOfWeek, preferredTime, specialInstructions, preferredCleanerId } = req.body;
      const updated = await storage.updateRecurringBooking(rb.id, {
        ...(isActive !== undefined && { isActive }),
        ...(frequency !== undefined && { frequency }),
        ...(dayOfWeek !== undefined && { dayOfWeek }),
        ...(preferredTime !== undefined && { preferredTime }),
        ...(specialInstructions !== undefined && { specialInstructions }),
        ...(preferredCleanerId !== undefined && { preferredCleanerId }),
      });
      res.json(updated);
    } catch (err: unknown) {
      res.status(400).json({ message: (err as Error).message });
    }
  });

  app.delete("/api/recurring-bookings/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const rb = await storage.getRecurringBooking(req.params.id);
      if (!rb) return res.status(404).json({ message: "Recurring booking not found" });
      const admin = await isAdmin(req);
      if (rb.userId !== userId && !admin) return res.status(403).json({ message: "Not your booking" });
      await storage.deleteRecurringBooking(rb.id);
      res.json({ success: true });
    } catch (err: unknown) {
      res.status(500).json({ message: (err as Error).message });
    }
  });

  // === JOB PHOTOS (Before / After) ===
  app.get("/api/jobs/:id/photos", isAuthenticated, async (req, res) => {
    try {
      const job = await storage.getJob(req.params.id);
      if (!job) return res.status(404).json({ message: "Job not found" });
      const photos = await storage.getJobPhotos(job.id);
      res.json(photos);
    } catch (err: unknown) {
      res.status(500).json({ message: (err as Error).message });
    }
  });

  app.post("/api/jobs/:id/photos", isAuthenticated, upload.array("photos", 10), async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const job = await storage.getJob(req.params.id);
      if (!job) return res.status(404).json({ message: "Job not found" });

      const admin = await isAdmin(req);
      const cleaner = await storage.getCleanerByUserId(userId);
      const isJobCleaner = cleaner && job.cleanerId === cleaner.id;
      if (!admin && !isJobCleaner) return res.status(403).json({ message: "Only the assigned cleaner or an admin can upload photos" });

      const type = (req.body.type === "after") ? "after" : "before";
      const files: Express.Multer.File[] = req.files || [];
      if (files.length === 0) return res.status(400).json({ message: "No valid image files received" });

      const saved = await Promise.all(files.map(file => {
        const ext = path.extname(file.originalname) || ".jpg";
        const dest = path.join(uploadDir, `${file.filename}${ext}`);
        fs.renameSync(file.path, dest);
        return storage.createJobPhoto({
          jobId: job.id,
          type,
          url: `/uploads/${file.filename}${ext}`,
          uploadedByUserId: userId,
        });
      }));

      res.json(saved);
    } catch (err: unknown) {
      res.status(500).json({ message: (err as Error).message });
    }
  });

  app.delete("/api/job-photos/:id", isAuthenticated, async (req, res) => {
    try {
      const admin = await isAdmin(req);
      if (!admin) return res.status(403).json({ message: "Admin only" });
      await storage.deleteJobPhoto(req.params.id);
      res.json({ success: true });
    } catch (err: unknown) {
      res.status(500).json({ message: (err as Error).message });
    }
  });

  // === TIPPING ===
  app.post("/api/jobs/:id/tip", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const job = await storage.getJob(req.params.id);
      if (!job) return res.status(404).json({ message: "Job not found" });
      if (job.status !== "completed") return res.status(400).json({ message: "Can only tip on completed jobs" });
      if (job.tipAmount) return res.status(400).json({ message: "Tip already submitted for this job" });

      const client = await storage.getClient(job.clientId);
      if (!client || client.userId !== userId) return res.status(403).json({ message: "Not your job" });

      const { amount } = req.body;
      const tipDollars = Number(amount);
      if (!tipDollars || tipDollars < 1 || tipDollars > 500) {
        return res.status(400).json({ message: "Tip must be between $1 and $500" });
      }

      const profile = await storage.getUserProfile(userId);
      if (!profile?.stripeCustomerId || !profile?.stripePaymentMethodId) {
        return res.status(400).json({ message: "No payment method on file. Please add a card first." });
      }

      const stripe = await getUncachableStripeClient();
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(tipDollars * 100),
        currency: "usd",
        customer: profile.stripeCustomerId,
        payment_method: profile.stripePaymentMethodId,
        confirm: true,
        off_session: true,
        description: `Tip for cleaning job ${job.id} at ${job.propertyAddress}`,
        metadata: { jobId: job.id, userId, type: "tip" },
      });

      const updatedJob = await storage.updateJob(job.id, {
        tipAmount: String(tipDollars.toFixed(2)),
        tipStripeIntentId: paymentIntent.id,
        tipPaidAt: new Date(),
      });

      if (job.cleanerId) {
        const cleaner = await storage.getCleaner(job.cleanerId);
        if (cleaner?.userId) {
          await storage.createNotification({
            userId: cleaner.userId,
            title: `You received a $${tipDollars.toFixed(0)} tip! 🎉`,
            message: `A client left you a tip for your cleaning at ${job.propertyAddress}. Great work!`,
            type: "tip_received",
            jobId: job.id,
          });
          sendToUser(cleaner.userId, { type: "tip_received", jobId: job.id, amount: tipDollars });

          const cleanerUser = await authStorage.getUser(cleaner.userId);
          const clientUser = await authStorage.getUser(userId);
          if (cleanerUser?.email) {
            sendTipReceivedEmail(
              cleanerUser.email,
              cleaner.name,
              clientUser?.firstName || "A client",
              job.propertyAddress,
              tipDollars.toFixed(2)
            ).catch(() => {});
          }
        }
      }

      res.json({ success: true, job: updatedJob, paymentIntentId: paymentIntent.id });
    } catch (err: unknown) {
      const msg = (err as any)?.raw?.message || (err as Error).message;
      res.status(500).json({ message: `Tip failed: ${msg}` });
    }
  });
}
