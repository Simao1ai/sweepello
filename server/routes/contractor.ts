import { type Express } from "express";
import { storage } from "../storage";
import { isAuthenticated, authStorage } from "../replit_integrations/auth";
import {
  insertCleanerAvailabilitySchema,
  insertContractorOnboardingSchema,
  insertContractorApplicationSchema,
} from "@shared/schema";
import { acceptJobOffer, declineJobOffer } from "../matching";
import { getUncachableStripeClient } from "../stripeClient";
import {
  sendApplicationApprovedEmail, sendApplicationRejectedEmail,
  sendCleanerEnRouteEmail, sendJobCompletedEmail,
} from "../sendgrid";
import { sendToUser, broadcast } from "../ws";
import { z } from "zod";
import { getUserId, isAdmin, isContractor, handleZodError } from "./helpers";

export function registerContractorRoutes(app: Express) {
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
    const enriched = await Promise.all(contractorJobs.map(async (job) => {
      if (!job.serviceRequestId) return job;
      const sr = await storage.getServiceRequest(job.serviceRequestId);
      return {
        ...job,
        preferredTime: sr?.preferredTime || null,
        confirmedArrivalTime: sr?.confirmedArrivalTime || null,
        serviceRequestId: job.serviceRequestId,
      };
    }));
    res.json(enriched);
  });

  app.patch("/api/contractor/jobs/:id/confirm-arrival", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const contractor = await isContractor(req);
      if (!contractor) return res.status(403).json({ message: "Contractor only" });
      const cleaner = await storage.getCleanerByUserId(userId);
      if (!cleaner) return res.status(404).json({ message: "No contractor profile linked" });
      const job = await storage.getJob(req.params.id);
      if (!job || job.cleanerId !== cleaner.id) return res.status(403).json({ message: "Not your job" });
      const { arrivalTime } = req.body;
      if (!arrivalTime || typeof arrivalTime !== "string") {
        return res.status(400).json({ message: "arrivalTime required (HH:MM)" });
      }
      if (!job.serviceRequestId) return res.status(400).json({ message: "No service request linked" });
      const sr = await storage.getServiceRequest(job.serviceRequestId);
      if (!sr) return res.status(404).json({ message: "Service request not found" });
      await storage.updateServiceRequest(job.serviceRequestId, { confirmedArrivalTime: arrivalTime });
      const [h, m] = arrivalTime.split(":").map(Number);
      const isPM = h >= 12;
      const hour12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
      const formatted = `${hour12}:${String(m).padStart(2, "0")} ${isPM ? "PM" : "AM"}`;
      await storage.createNotification({
        userId: sr.userId,
        title: "Arrival Time Confirmed",
        message: `Your cleaner has confirmed they will arrive at ${formatted} for your cleaning at ${sr.propertyAddress}.`,
        type: "job_assigned",
        serviceRequestId: sr.id,
        jobId: job.id,
      });
      res.json({ success: true, confirmedArrivalTime: arrivalTime });
    } catch (err: unknown) {
      console.error("Confirm arrival error:", err);
      res.status(500).json({ message: "Failed to confirm arrival time" });
    }
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

      const { slots } = z.object({ slots: z.array(z.record(z.unknown())).default([]) })
        .parse(req.body);

      await storage.deleteCleanerAvailability(cleaner.id);
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
          const clientUser = await authStorage.getUser(sr.userId);
          if (clientUser?.email) {
            sendCleanerEnRouteEmail(
              clientUser.email,
              clientUser.firstName || "Client",
              cleaner.name,
              job.propertyAddress
            ).catch(() => {});
          }
        }
        await storage.updateServiceRequest(job.serviceRequestId, { status: "in_route" });
      }

      if (status === "completed") {
        await storage.updateCleaner(cleaner.id, {
          totalJobs: (cleaner.totalJobs || 0) + 1,
          totalRevenue: (Number(cleaner.totalRevenue || 0) + Number(job.cleanerPay || 0)).toFixed(2),
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
            const clientUser = await authStorage.getUser(sr.userId);
            const appDomain = process.env.REPLIT_DOMAINS?.split(",")[0] || "localhost:5000";
            if (clientUser?.email) {
              sendJobCompletedEmail(
                clientUser.email,
                clientUser.firstName || "Client",
                cleaner.name,
                job.propertyAddress,
                `https://${appDomain}/rate/${job.serviceRequestId}`
              ).catch(() => {});
            }
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
}
