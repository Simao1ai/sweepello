import { type Express } from "express";
import { storage } from "../storage";
import { isAuthenticated, authStorage } from "../replit_integrations/auth";
import { insertServiceRequestSchema, insertRecurringBookingSchema } from "@shared/schema";
import { calculateBrokeragePrice, broadcastJobOffers, calculateSurgeMultiplier } from "../matching";
import { getUncachableStripeClient, getStripePublishableKey } from "../stripeClient";
import {
  sendCancellationConfirmedEmail,
  sendRecurringBookingCreatedEmail,
  sendBookingConfirmedEmail,
} from "../sendgrid";
import { z } from "zod";
import { getUserId, isAdmin, handleZodError } from "./helpers";

export function registerClientRoutes(app: Express) {
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

      const onlineCleaners = await storage.getOnlineCleaners();
      const allActiveRequests = await storage.getServiceRequests();
      const activeCount = allActiveRequests.filter(r => ["pending", "broadcasting", "matching"].includes(r.status)).length;
      const surgeMultiplier = calculateSurgeMultiplier(onlineCleaners.length, activeCount);

      const surgedClientPrice = surgeMultiplier > 1.0
        ? Math.round((pricing.clientPrice * surgeMultiplier) / 5) * 5
        : pricing.clientPrice;

      const updated = await storage.updateServiceRequest(request.id, {
        estimatedPrice: String(surgedClientPrice),
        subcontractorCost: String(pricing.subcontractorCost),
        surgeMultiplier: String(surgeMultiplier),
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
    const { serviceType, bedrooms, bathrooms, squareFootage, basement, applySurge } = req.query;
    const pricing = calculateBrokeragePrice(
      String(serviceType || "standard"),
      Number(bedrooms || 2),
      Number(bathrooms || 1),
      Number(squareFootage || 1000),
      basement === "true"
    );

    let surgeMultiplier = 1.0;
    if (applySurge === "true") {
      const onlineCleaners = await storage.getOnlineCleaners();
      const allActiveRequests = await storage.getServiceRequests();
      const activeCount = allActiveRequests.filter(r => ["pending", "broadcasting", "matching"].includes(r.status)).length;
      surgeMultiplier = calculateSurgeMultiplier(onlineCleaners.length, activeCount);
    }

    const surgedPrice = surgeMultiplier > 1.0
      ? Math.round((pricing.clientPrice * surgeMultiplier) / 5) * 5
      : pricing.clientPrice;

    const surgedPlatformFee = surgedPrice - pricing.subcontractorCost;
    const surgedMargin = surgedPrice > 0 ? ((surgedPlatformFee / surgedPrice) * 100) : 0;

    res.json({
      estimatedPrice: surgedPrice,
      subcontractorCost: pricing.subcontractorCost,
      platformFee: Math.round(surgedPlatformFee * 100) / 100,
      marginPercent: Math.round(surgedMargin * 10) / 10,
      surgeMultiplier,
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
    const enriched = await Promise.all(requests.map(async (sr) => {
      if (sr.assignedCleanerId) {
        const cleaner = await storage.getCleaner(sr.assignedCleanerId);
        if (cleaner) {
          return {
            ...sr,
            assignedCleanerName: cleaner.name,
            assignedCleanerRating: cleaner.rating ? Number(cleaner.rating) : null,
            assignedCleanerTotalJobs: cleaner.totalJobs || 0,
          };
        }
      }
      return sr;
    }));
    res.json(enriched);
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

  // === STRIPE PUBLISHABLE KEY ===
  app.get("/api/stripe/publishable-key", async (_req, res) => {
    try {
      const key = await getStripePublishableKey();
      res.json({ publishableKey: key });
    } catch (err: unknown) {
      res.status(500).json({ message: "Stripe not configured" });
    }
  });

  // === CLIENT BILLING (Stripe) ===
  app.get("/api/billing/payment-method", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const profile = await storage.getUserProfile(userId);
      if (!profile) return res.status(404).json({ message: "Profile not found" });
      if (profile.stripeCardLast4) {
        return res.json({
          hasCard: true,
          brand: profile.stripeCardBrand,
          last4: profile.stripeCardLast4,
          customerId: profile.stripeCustomerId,
        });
      }
      return res.json({ hasCard: false });
    } catch (err: unknown) {
      res.status(500).json({ message: "Failed to get payment method" });
    }
  });

  app.post("/api/billing/setup-intent", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const user = (req as any).user;
      const profile = await storage.getUserProfile(userId);
      if (!profile) return res.status(404).json({ message: "Profile not found" });
      const stripe = await getUncachableStripeClient();
      let customerId = profile.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user?.email || undefined,
          name: user?.firstName ? `${user.firstName} ${user.lastName || ""}`.trim() : undefined,
          metadata: { userId },
        });
        customerId = customer.id;
        await storage.updateUserProfile(userId, { stripeCustomerId: customerId });
      }
      const setupIntent = await stripe.setupIntents.create({
        customer: customerId,
        payment_method_types: ["card"],
      });
      res.json({ clientSecret: setupIntent.client_secret });
    } catch (err: unknown) {
      console.error("Setup intent error:", err);
      res.status(500).json({ message: "Failed to create setup intent" });
    }
  });

  app.post("/api/billing/payment-method/save", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { paymentMethodId } = req.body;
      if (!paymentMethodId) return res.status(400).json({ message: "paymentMethodId required" });
      const profile = await storage.getUserProfile(userId);
      if (!profile) return res.status(404).json({ message: "Profile not found" });
      const stripe = await getUncachableStripeClient();
      const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
      if (profile.stripeCustomerId) {
        await stripe.paymentMethods.attach(paymentMethodId, { customer: profile.stripeCustomerId });
        await stripe.customers.update(profile.stripeCustomerId, {
          invoice_settings: { default_payment_method: paymentMethodId },
        });
      }
      await storage.updateUserProfile(userId, {
        stripePaymentMethodId: paymentMethodId,
        stripeCardBrand: pm.card?.brand || null,
        stripeCardLast4: pm.card?.last4 || null,
      });
      res.json({ success: true, brand: pm.card?.brand, last4: pm.card?.last4 });
    } catch (err: unknown) {
      console.error("Save payment method error:", err);
      res.status(500).json({ message: "Failed to save payment method" });
    }
  });

  app.delete("/api/billing/payment-method", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const profile = await storage.getUserProfile(userId);
      if (!profile) return res.status(404).json({ message: "Profile not found" });
      if (profile.stripePaymentMethodId) {
        const stripe = await getUncachableStripeClient();
        try {
          await stripe.paymentMethods.detach(profile.stripePaymentMethodId);
        } catch { /* already detached */ }
      }
      await storage.updateUserProfile(userId, {
        stripePaymentMethodId: null,
        stripeCardBrand: null,
        stripeCardLast4: null,
      });
      res.json({ success: true });
    } catch (err: unknown) {
      res.status(500).json({ message: "Failed to remove payment method" });
    }
  });

  // === CANCELLATION (three-tier policy) ===
  app.post("/api/service-requests/:id/cancel", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const sr = await storage.getServiceRequest(req.params.id);
      if (!sr) return res.status(404).json({ message: "Service request not found" });
      if (sr.userId !== userId) return res.status(403).json({ message: "Not your booking" });
      const cancelableStatuses = ["pending", "broadcasting", "confirmed"];
      if (!cancelableStatuses.includes(sr.status)) {
        return res.status(400).json({ message: "Cannot cancel a booking that is in progress or completed" });
      }

      const serviceDate = new Date(sr.requestedDate);
      const now = new Date();
      const hoursUntilService = (serviceDate.getTime() - now.getTime()) / (1000 * 60 * 60);

      type CancelTier = "free" | "half" | "full";
      const tier: CancelTier =
        hoursUntilService >= 24 ? "free" :
        hoursUntilService >= 12 ? "half" : "full";

      let cancellationFeeCharged = false;
      let refundAmount: string | undefined;
      let chargeAmount: string | undefined;

      const bookingPrice = Number(sr.estimatedPrice || 0);

      if (tier === "free") {
        if (sr.jobId) {
          try {
            const payments = await storage.getPaymentsByJobId(sr.jobId);
            const capturedPayment = payments.find(p => p.type === "incoming" && p.status === "paid" && p.stripePaymentIntentId);
            if (capturedPayment?.stripePaymentIntentId) {
              const stripe = await getUncachableStripeClient();
              const refund = await stripe.refunds.create({
                payment_intent: capturedPayment.stripePaymentIntentId,
                reason: "requested_by_customer",
              });
              if (refund.status === "succeeded" || refund.status === "pending") {
                await storage.updatePayment(capturedPayment.id, { status: "refunded" } as any);
                refundAmount = `$${Number(capturedPayment.amount).toFixed(2)}`;
                console.log(`[cancel] Full refund ${refundAmount} for SR ${sr.id}`);
              }
            }
          } catch (refundErr) {
            console.error("Failed to issue full refund:", refundErr);
          }
        }
      } else {
        const chargePercent = tier === "half" ? 0.5 : 1.0;

        if (sr.jobId) {
          try {
            const payments = await storage.getPaymentsByJobId(sr.jobId);
            const capturedPayment = payments.find(p => p.type === "incoming" && p.status === "paid" && p.stripePaymentIntentId);
            if (capturedPayment?.stripePaymentIntentId) {
              const stripe = await getUncachableStripeClient();
              const capturedCents = Math.round(Number(capturedPayment.amount) * 100);
              if (tier === "half") {
                const refundCents = Math.round(capturedCents * 0.5);
                const refund = await stripe.refunds.create({
                  payment_intent: capturedPayment.stripePaymentIntentId,
                  amount: refundCents,
                  reason: "requested_by_customer",
                });
                if (refund.status === "succeeded" || refund.status === "pending") {
                  refundAmount = `$${(refundCents / 100).toFixed(2)}`;
                  chargeAmount = `$${(capturedCents / 100 - refundCents / 100).toFixed(2)}`;
                  cancellationFeeCharged = true;
                  console.log(`[cancel] 50% refund ${refundAmount} for SR ${sr.id}`);
                }
              } else {
                chargeAmount = `$${(capturedCents / 100).toFixed(2)}`;
                cancellationFeeCharged = true;
                console.log(`[cancel] No refund (within 12h) for SR ${sr.id}`);
              }
            }
          } catch (refundErr) {
            console.error("Failed to process partial refund:", refundErr);
          }
        } else if (bookingPrice > 0) {
          const profile = await storage.getUserProfile(userId);
          if (profile?.stripeCustomerId && profile?.stripePaymentMethodId) {
            try {
              const chargeCents = Math.round(bookingPrice * chargePercent * 100);
              const stripe = await getUncachableStripeClient();
              await stripe.paymentIntents.create({
                amount: chargeCents,
                currency: "usd",
                customer: profile.stripeCustomerId,
                payment_method: profile.stripePaymentMethodId,
                confirm: true,
                off_session: true,
                description: `Cancellation fee (${tier === "half" ? "50%" : "100%"}) — service request ${sr.id}`,
              });
              cancellationFeeCharged = true;
              chargeAmount = `$${(chargeCents / 100).toFixed(2)}`;
              console.log(`[cancel] Charged ${chargeAmount} (${tier}) for SR ${sr.id}`);
            } catch (feeErr) {
              console.error("Failed to charge cancellation fee:", feeErr);
            }
          }
        }
      }

      await storage.updateServiceRequest(req.params.id, {
        status: "cancelled",
        canceledAt: new Date(),
        cancellationFeeCharged,
      });

      if (sr.jobId) {
        await storage.updateJob(sr.jobId, { status: "cancelled" });
      }

      const authUser = await authStorage.getUser(userId);
      if (authUser?.email) {
        sendCancellationConfirmedEmail(
          authUser.email,
          authUser.firstName || "Client",
          sr.propertyAddress,
          serviceDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
          tier,
          chargeAmount,
          refundAmount
        ).catch(() => {});
      }

      const feeNote = tier === "free"
        ? (refundAmount ? ` A full refund of ${refundAmount} has been issued.` : " No charge.")
        : tier === "half"
          ? (chargeAmount ? ` A 50% cancellation fee of ${chargeAmount} was charged${refundAmount ? ` and ${refundAmount} refunded` : ""}.` : " A 50% cancellation fee applies.")
          : (chargeAmount ? ` The full booking amount of ${chargeAmount} was retained (cancelled within 12 hours).` : " No refund — cancelled within 12 hours.");
      const cancelMsg = `Client cancelled the booking for ${sr.propertyAddress} (${new Date(sr.requestedDate).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}).${feeNote}`;

      const admins = await storage.getUsersByRole("admin");
      await Promise.all(admins.map(admin =>
        storage.createNotification({
          userId: admin.userId,
          title: "Booking Cancelled by Client",
          message: cancelMsg,
          type: "job_cancelled",
          serviceRequestId: sr.id,
        })
      ));

      if (sr.assignedCleanerId) {
        const cleaner = await storage.getCleaner(sr.assignedCleanerId);
        if (cleaner?.userId) {
          await storage.createNotification({
            userId: cleaner.userId,
            title: "Job Cancelled",
            message: `The client has cancelled the cleaning job at ${sr.propertyAddress} on ${new Date(sr.requestedDate).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}. This job has been removed from your schedule.`,
            type: "job_cancelled",
            serviceRequestId: sr.id,
          });
        }
      }

      const responseMessage =
        tier === "free"
          ? refundAmount
            ? `Booking cancelled. A full refund of ${refundAmount} has been issued.`
            : "Booking cancelled successfully. No charge."
          : tier === "half"
            ? chargeAmount
              ? `Booking cancelled. A 50% fee of ${chargeAmount} was charged${refundAmount ? ` and ${refundAmount} refunded` : ""}.`
              : "Booking cancelled. A 50% cancellation fee applies (12–24 hours notice)."
            : chargeAmount
              ? `Booking cancelled. The full amount of ${chargeAmount} was retained — cancellations within 12 hours are non-refundable.`
              : "Booking cancelled. No refund — cancelled within 12 hours of service.";

      res.json({
        success: true,
        tier,
        cancellationFeeCharged,
        chargeAmount,
        refundAmount,
        message: responseMessage,
      });
    } catch (err: unknown) {
      console.error("Cancel error:", err);
      res.status(500).json({ message: "Failed to cancel booking" });
    }
  });
}
