import { storage } from "./storage";
import type { RecurringBooking } from "@shared/schema";

function computeNextServiceDate(rb: RecurringBooking, from: Date): Date {
  const next = new Date(from);
  switch (rb.frequency) {
    case "weekly":
      next.setDate(next.getDate() + 7);
      break;
    case "biweekly":
      next.setDate(next.getDate() + 14);
      break;
    case "monthly":
      next.setMonth(next.getMonth() + 1);
      break;
    default:
      next.setDate(next.getDate() + 7);
  }
  return next;
}

async function processDueRecurringBookings(): Promise<void> {
  const now = new Date();
  const label = now.toISOString().split("T")[0];

  let due: RecurringBooking[];
  try {
    due = await storage.getActiveRecurringBookingsDue(now);
  } catch (err) {
    console.error(`[scheduler ${label}] Failed to fetch due recurring bookings:`, err);
    return;
  }

  if (due.length === 0) {
    console.log(`[scheduler ${label}] No recurring bookings due.`);
    return;
  }

  console.log(`[scheduler ${label}] Processing ${due.length} due recurring booking(s).`);

  for (const rb of due) {
    try {
      const requestedDate = rb.nextServiceDate ?? now;

      await storage.createServiceRequest({
        userId: rb.userId,
        propertyAddress: rb.propertyAddress,
        city: rb.city ?? undefined,
        zipCode: rb.zipCode ?? undefined,
        propertyType: "airbnb",
        serviceType: rb.serviceType,
        bedrooms: rb.bedrooms ?? undefined,
        bathrooms: rb.bathrooms ?? undefined,
        squareFootage: rb.squareFootage ?? undefined,
        basement: rb.basement ?? false,
        requestedDate,
        preferredTime: rb.preferredTime ?? undefined,
        specialInstructions: rb.specialInstructions ?? undefined,
        preferredCleanerId: rb.preferredCleanerId ?? undefined,
        status: "pending",
        estimatedPrice: rb.estimatedPrice ?? undefined,
        isOnDemand: false,
      });

      const nextServiceDate = computeNextServiceDate(rb, requestedDate);

      await storage.updateRecurringBooking(rb.id, {
        lastServiceDate: now,
        nextServiceDate,
      });

      console.log(`[scheduler ${label}] Created service request for recurring booking ${rb.id}. Next: ${nextServiceDate.toISOString().split("T")[0]}.`);
    } catch (err) {
      console.error(`[scheduler ${label}] Error processing recurring booking ${rb.id}:`, err);
    }
  }
}

const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

export function startRecurringBookingScheduler(): void {
  console.log("[scheduler] Recurring booking scheduler started.");
  processDueRecurringBookings();
  setInterval(processDueRecurringBookings, TWENTY_FOUR_HOURS);
}
