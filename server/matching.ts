import { storage } from "./storage";
import type { ServiceRequest, Cleaner, CleanerAvailability } from "@shared/schema";

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

  const availableCleaners: Cleaner[] = [];
  for (const cleaner of matched) {
    const availability = await storage.getCleanerAvailability(cleaner.id);
    if (availability.length === 0) {
      availableCleaners.push(cleaner);
      continue;
    }
    const dayAvail = availability.find(a => a.dayOfWeek === dayOfWeek);
    if (dayAvail && dayAvail.isAvailable) {
      availableCleaners.push(cleaner);
    }
  }

  const sorted = availableCleaners.sort((a, b) => {
    const ratingDiff = Number(b.rating || 0) - Number(a.rating || 0);
    if (ratingDiff !== 0) return ratingDiff;
    const onTimeDiff = (b.onTimePercent || 0) - (a.onTimePercent || 0);
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
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

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

export async function acceptJobOffer(offerId: string, cleanerId: string): Promise<{ success: boolean; message: string }> {
  const offer = await storage.getJobOffer(offerId);
  if (!offer) return { success: false, message: "Offer not found" };
  if (offer.cleanerId !== cleanerId) return { success: false, message: "Not your offer" };
  if (offer.status !== "offered") return { success: false, message: "Offer no longer available" };

  if (offer.expiresAt && new Date(offer.expiresAt) < new Date()) {
    await storage.updateJobOffer(offerId, { status: "expired" });
    return { success: false, message: "Offer has expired" };
  }

  const otherOffers = await storage.getJobOffersByServiceRequest(offer.serviceRequestId);
  const alreadyAccepted = otherOffers.find(o => o.status === "accepted");
  if (alreadyAccepted) {
    await storage.updateJobOffer(offerId, { status: "expired", respondedAt: new Date() });
    return { success: false, message: "Job already taken by another cleaner" };
  }

  await storage.updateJobOffer(offerId, { status: "accepted", respondedAt: new Date() });

  for (const other of otherOffers) {
    if (other.id !== offerId && other.status === "offered") {
      await storage.updateJobOffer(other.id, { status: "expired", respondedAt: new Date() });
    }
  }

  const request = await storage.getServiceRequest(offer.serviceRequestId);
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

  return { success: true, message: "Job accepted successfully" };
}

export async function declineJobOffer(offerId: string, cleanerId: string): Promise<{ success: boolean; message: string }> {
  const offer = await storage.getJobOffer(offerId);
  if (!offer) return { success: false, message: "Offer not found" };
  if (offer.cleanerId !== cleanerId) return { success: false, message: "Not your offer" };
  if (offer.status !== "offered") return { success: false, message: "Offer no longer available" };

  await storage.updateJobOffer(offerId, { status: "declined", respondedAt: new Date() });

  return { success: true, message: "Offer declined" };
}
