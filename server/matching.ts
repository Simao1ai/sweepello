import { storage } from "./storage";
import { db } from "./db";
import { jobOffers, serviceRequests } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { getUncachableStripeClient } from "./stripeClient";
import { authStorage } from "./replit_integrations/auth";
import { sendBookingConfirmedEmail } from "./sendgrid";
import type { ServiceRequest, Cleaner } from "@shared/schema";

export interface MatchedCleaner {
  cleaner: Cleaner;
  rank: number;
  isPreferred: boolean;
}

const SUB_RATES: Record<string, number> = {
  standard: 0.10,
  deep: 0.14,
  "move-out": 0.18,
};

const MARKET_FLOORS: Record<string, number> = {
  standard: 0.14,
  deep: 0.20,
  "move-out": 0.24,
};

const TARGET_MARGIN = 0.30;
const MINIMUM_PRICE = 120;

export interface PricingBreakdown {
  subcontractorCost: number;
  clientPrice: number;
  platformFee: number;
  marginPercent: number;
}

export function calculateBrokeragePrice(
  serviceType: string,
  bedrooms: number,
  bathrooms: number,
  squareFootage: number,
  basement: boolean = false
): PricingBreakdown {
  const subRate = SUB_RATES[serviceType] || SUB_RATES.standard;
  const marketFloor = MARKET_FLOORS[serviceType] || MARKET_FLOORS.standard;

  const sqft = Math.max(squareFootage || 1000, 500);

  const subBase = sqft * subRate;
  const subBedAdj = Math.max(0, bedrooms - 2) * 8;
  const subBathAdj = Math.max(0, bathrooms - 1) * 20;
  const subBasementAdj = basement ? Math.max(40, 0.02 * sqft) : 0;

  const subTotal = subBase + subBedAdj + subBathAdj + subBasementAdj;

  let clientPrice = subTotal / (1 - TARGET_MARGIN);

  const marketFloorPrice = sqft * marketFloor;
  clientPrice = Math.max(clientPrice, marketFloorPrice);

  clientPrice = Math.max(clientPrice, MINIMUM_PRICE);

  clientPrice = Math.round(clientPrice / 5) * 5;

  const platformFee = clientPrice - subTotal;
  const marginPercent = (platformFee / clientPrice) * 100;

  return {
    subcontractorCost: Math.round(subTotal * 100) / 100,
    clientPrice,
    platformFee: Math.round(platformFee * 100) / 100,
    marginPercent: Math.round(marginPercent * 10) / 10,
  };
}

export function calculatePrice(
  serviceType: string,
  bedrooms: number,
  bathrooms: number,
  squareFootage?: number,
  basement?: boolean
): number {
  const result = calculateBrokeragePrice(
    serviceType,
    bedrooms,
    bathrooms,
    squareFootage || 1000,
    basement || false
  );
  return result.clientPrice;
}

export async function findMatchingCleaners(request: ServiceRequest): Promise<MatchedCleaner[]> {
  const allCleaners = await storage.getCleaners();
  const activeCleaners = allCleaners.filter(c => c.status === "active");

  let matched = activeCleaners;
  if (request.zipCode) {
    matched = matched.filter(c => {
      if (!c.zipCodes) return true;
      return c.zipCodes.split(",").map(z => z.trim()).includes(request.zipCode!);
    });
  }

  const requestedDate = new Date(request.requestedDate);
  const dayOfWeek = requestedDate.getDay();

  // Normalize the requested date to a YYYY-MM-DD string for day-level comparison
  const requestedDateStr = requestedDate.toISOString().slice(0, 10);

  const availableCleaners: Cleaner[] = [];
  for (const cleaner of matched) {
    // Step 1: Check weekly availability schedule
    const availability = await storage.getCleanerAvailability(cleaner.id);
    if (availability.length > 0) {
      const dayAvail = availability.find(a => a.dayOfWeek === dayOfWeek);
      if (!dayAvail || !dayAvail.isAvailable) continue;
    }

    // Fix 10: Step 2: Check for existing confirmed/in_progress/in_route jobs on the same calendar date.
    // Exclude any cleaner who is already booked on that day.
    const existingJobs = await storage.getJobsByCleanerId(cleaner.id);
    const hasConflict = existingJobs.some(job => {
      if (!["assigned", "in_route", "in_progress"].includes(job.status)) return false;
      const jobDateStr = new Date(job.scheduledDate).toISOString().slice(0, 10);
      return jobDateStr === requestedDateStr;
    });

    if (!hasConflict) {
      availableCleaners.push(cleaner);
    }
  }

  const sorted = availableCleaners.sort((a, b) => {
    const ratingDiff = Number(b.rating || 0) - Number(a.rating || 0);
    if (ratingDiff !== 0) return ratingDiff;
    const onTimeDiff = (Number(b.onTimePercent) || 0) - (Number(a.onTimePercent) || 0);
    if (onTimeDiff !== 0) return onTimeDiff;
    return (b.totalJobs || 0) - (a.totalJobs || 0);
  });

  const result: MatchedCleaner[] = [];
  let rank = 0;

  if (request.preferredCleanerId) {
    const preferred = sorted.find(c => c.id === request.preferredCleanerId);
    if (preferred) {
      result.push({ cleaner: preferred, rank: 0, isPreferred: true });
      rank = 1;
    }
  }

  for (const cleaner of sorted) {
    if (cleaner.id === request.preferredCleanerId) continue;
    result.push({ cleaner, rank: rank++, isPreferred: false });
  }

  return result;
}

export async function broadcastJobOffers(serviceRequestId: string): Promise<{ offersCreated: number; preferredNotified: boolean }> {
  const request = await storage.getServiceRequest(serviceRequestId);
  if (!request) throw new Error("Service request not found");

  const existingOffers = await storage.getJobOffersByServiceRequest(serviceRequestId);
  const alreadyOfferedIds = new Set(existingOffers.map(o => o.cleanerId));

  const matched = await findMatchingCleaners(request);
  const newMatches = matched.filter(m => !alreadyOfferedIds.has(m.cleaner.id));

  if (newMatches.length === 0) {
    return { offersCreated: 0, preferredNotified: false };
  }

  let preferredNotified = false;
  const expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000);

  const scheduledDate = new Date(request.requestedDate).toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric",
  });

  for (const match of newMatches) {
    const offer = await storage.createJobOffer({
      serviceRequestId,
      cleanerId: match.cleaner.id,
      status: "offered",
      priorityRank: match.rank,
      expiresAt,
    });

    if (match.cleaner.userId) {
      const isPreferred = match.isPreferred;
      await storage.createNotification({
        userId: match.cleaner.userId,
        title: isPreferred ? "Priority Job Offer - Preferred Client" : "New Job Available",
        message: `${isPreferred ? "A client has requested you! " : ""}${(request.serviceType || "standard").charAt(0).toUpperCase() + (request.serviceType || "standard").slice(1)} clean at ${request.propertyAddress} on ${scheduledDate}. ${request.bedrooms || 2}BR/${request.bathrooms || 1}BA${request.squareFootage ? `, ${request.squareFootage} sqft` : ""}. Est. $${Number(request.estimatedPrice || 0).toFixed(0)}.`,
        type: "job_offer",
        serviceRequestId,
        jobOfferId: offer.id,
      });
      if (isPreferred) preferredNotified = true;
    }
  }

  if (request.status === "pending") {
    await storage.updateServiceRequest(serviceRequestId, { status: "broadcasting" });
  }

  return { offersCreated: newMatches.length, preferredNotified };
}

// Fix 1: Attempt to charge the client's saved card via Stripe PaymentIntent.
// Returns the PaymentIntent ID on success, null on failure (non-blocking).
async function chargeClientForJob(
  userId: string,
  amountDollars: number,
  jobId: string,
  serviceRequestId: string
): Promise<string | null> {
  try {
    const profile = await storage.getUserProfile(userId);
    if (!profile?.stripeCustomerId || !profile?.stripePaymentMethodId) {
      console.warn(`[Stripe] No saved card for user ${userId} — skipping charge`);
      return null;
    }

    const stripe = await getUncachableStripeClient();
    const amountCents = Math.round(amountDollars * 100);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: "usd",
      customer: profile.stripeCustomerId,
      payment_method: profile.stripePaymentMethodId,
      confirm: true,
      off_session: true,
      description: `Cleaning service — Job ${jobId} (SR ${serviceRequestId})`,
      metadata: { jobId, serviceRequestId, userId },
    });

    console.log(`[Stripe] PaymentIntent ${paymentIntent.id} created for job ${jobId} — status: ${paymentIntent.status}`);
    return paymentIntent.id;
  } catch (err: unknown) {
    console.error(`[Stripe] PaymentIntent creation failed for job ${jobId}:`, (err as Error).message);
    return null;
  }
}

// Fix 2: Accept a job offer using a DB transaction to prevent race conditions.
export async function acceptJobOffer(offerId: string, cleanerId: string): Promise<{ success: boolean; message: string }> {
  // Use a DB transaction to atomically check and claim the offer.
  // This prevents two cleaners from accepting the same job simultaneously.
  try {
    const result = await db.transaction(async (tx) => {
      // Lock the offer row and read it inside the transaction
      const [offer] = await tx
        .select()
        .from(jobOffers)
        .where(eq(jobOffers.id, offerId))
        .for("update");

      if (!offer) return { success: false, message: "Offer not found" };
      if (offer.cleanerId !== cleanerId) return { success: false, message: "Not your offer" };
      if (offer.status !== "offered") return { success: false, message: "Offer no longer available" };

      if (offer.expiresAt && new Date(offer.expiresAt) < new Date()) {
        await tx.update(jobOffers).set({ status: "expired" }).where(eq(jobOffers.id, offerId));
        return { success: false, message: "Offer has expired" };
      }

      // Lock the service request row and verify it hasn't been claimed yet
      const [sr] = await tx
        .select()
        .from(serviceRequests)
        .where(eq(serviceRequests.id, offer.serviceRequestId))
        .for("update");

      if (!sr) return { success: false, message: "Service request not found" };

      // Check service request status — must not already be confirmed/in_progress/completed
      const alreadyTaken = ["confirmed", "in_progress", "in_route", "completed"].includes(sr.status);
      if (alreadyTaken) {
        await tx.update(jobOffers).set({ status: "expired", respondedAt: new Date() }).where(eq(jobOffers.id, offerId));
        return { success: false, message: "Job already taken by another cleaner" };
      }

      // Mark this offer as accepted
      await tx.update(jobOffers).set({ status: "accepted", respondedAt: new Date() }).where(eq(jobOffers.id, offerId));

      // Expire all other outstanding offers for this service request
      await tx
        .update(jobOffers)
        .set({ status: "expired", respondedAt: new Date() })
        .where(
          and(
            eq(jobOffers.serviceRequestId, offer.serviceRequestId),
            eq(jobOffers.status, "offered")
          )
        );

      return { success: true, message: "ok", offerId, serviceRequestId: offer.serviceRequestId };
    });

    if (!result.success) return result;

    // Outside the transaction: create the job, payments, notifications
    const serviceRequestId = (result as any).serviceRequestId;
    const request = await storage.getServiceRequest(serviceRequestId);
    if (!request) return { success: false, message: "Service request not found" };

    const cleaner = await storage.getCleaner(cleanerId);
    if (!cleaner) return { success: false, message: "Cleaner not found" };

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

    const clientPrice = request.estimatedPrice || "150.00";
    const subCost = request.subcontractorCost || String(Math.round(Number(clientPrice) * 0.70));

    const job = await storage.createJob({
      clientId: client.id,
      cleanerId,
      propertyAddress: request.propertyAddress,
      scheduledDate: request.requestedDate,
      status: "assigned",
      price: clientPrice,
      cleanerPay: subCost,
      serviceRequestId: request.id,
      notes: request.specialInstructions,
    });

    // Fix 1: Attempt to charge the client's saved card for the full job price.
    // This is non-blocking — if it fails, the job still gets created.
    const paymentIntentId = await chargeClientForJob(
      request.userId,
      Number(clientPrice),
      job.id,
      request.id
    );

    const incomingPayment = await storage.createPayment({
      jobId: job.id,
      cleanerId: job.cleanerId,
      amount: job.price,
      type: "incoming",
      status: paymentIntentId ? "paid" : "pending",
      paidAt: paymentIntentId ? new Date() : null,
    });

    // Store the PaymentIntent ID on the payment record so we can reconcile later
    if (paymentIntentId) {
      await storage.updatePayment(incomingPayment.id, { stripePaymentIntentId: paymentIntentId });
    }

    await storage.createPayment({
      jobId: job.id,
      cleanerId: job.cleanerId,
      amount: subCost,
      type: "outgoing",
      status: "pending",
      paidAt: null,
    });

    await storage.updateServiceRequest(request.id, {
      status: "confirmed",
      assignedCleanerId: cleanerId,
      jobId: job.id,
    });

    if (cleaner.userId) {
      await storage.createNotification({
        userId: cleaner.userId,
        title: "Job Confirmed",
        message: `You've accepted the cleaning at ${request.propertyAddress}. Check your Jobs page for details.`,
        type: "job_assigned",
        jobId: job.id,
        serviceRequestId: request.id,
      });
    }

    const cleanerRating = cleaner.rating ? `${Number(cleaner.rating).toFixed(1)} ★` : "New";
    await storage.createNotification({
      userId: request.userId,
      title: "Your Cleaner is Confirmed!",
      message: `${cleaner.name} (${cleanerRating}) has been assigned to your cleaning at ${request.propertyAddress} on ${new Date(request.requestedDate).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}. They will confirm an exact arrival time shortly.`,
      type: "job_assigned",
      jobId: job.id,
      serviceRequestId: request.id,
    });

    // Email: booking confirmed
    const clientAuthUser = await authStorage.getUser(request.userId).catch(() => null);
    if (clientAuthUser?.email) {
      sendBookingConfirmedEmail(
        clientAuthUser.email,
        clientAuthUser.firstName || "Client",
        cleaner.name,
        request.propertyAddress,
        new Date(request.requestedDate).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }),
        `$${Number(job.price).toFixed(2)}`
      ).catch(() => {});
    }

    // Notify admins if payment charge failed so they can follow up
    if (!paymentIntentId) {
      const admins = await storage.getUsersByRole("admin");
      await Promise.all(admins.map(admin =>
        storage.createNotification({
          userId: admin.userId,
          title: "⚠️ Payment collection pending",
          message: `Job accepted for ${request.propertyAddress} but no card was charged (client may not have a saved card). Payment of $${Number(clientPrice).toFixed(2)} is pending.`,
          type: "job_assigned",
          jobId: job.id,
          serviceRequestId: request.id,
        })
      ));
    }

    return { success: true, message: "Job accepted successfully" };
  } catch (err: unknown) {
    console.error("[acceptJobOffer] Error:", err);
    return { success: false, message: (err as Error).message || "Failed to accept offer" };
  }
}

export async function declineJobOffer(offerId: string, cleanerId: string): Promise<{ success: boolean; message: string }> {
  const offer = await storage.getJobOffer(offerId);
  if (!offer) return { success: false, message: "Offer not found" };
  if (offer.cleanerId !== cleanerId) return { success: false, message: "Not your offer" };
  if (offer.status !== "offered") return { success: false, message: "Offer no longer available" };

  await storage.updateJobOffer(offerId, { status: "declined", respondedAt: new Date() });

  return { success: true, message: "Offer declined" };
}

export function calculateSurgeMultiplier(onlineCleaners: number, activeRequests: number): number {
  if (onlineCleaners === 0) return 1.5;
  const ratio = onlineCleaners / Math.max(activeRequests, 1);
  if (ratio >= 2.0) return 1.0;
  if (ratio >= 1.5) return 1.1;
  if (ratio >= 1.0) return 1.25;
  if (ratio >= 0.5) return 1.5;
  return 1.75;
}
