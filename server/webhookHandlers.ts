import { getStripeSync, getStripeSecretKey } from './stripeClient';
import { storage } from "./storage";
import Stripe from "stripe";

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        'STRIPE WEBHOOK ERROR: Payload must be a Buffer. ' +
        'Received type: ' + typeof payload + '. ' +
        'Ensure webhook route is registered BEFORE app.use(express.json()).'
      );
    }

    const sync = await getStripeSync();
    await sync.processWebhook(payload, signature);

    // Also process application-level payment events
    try {
      const secretKey = await getStripeSecretKey();
      const stripe = new Stripe(secretKey, { apiVersion: '2025-08-27.basil' as any });
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

      let event: Stripe.Event;
      if (webhookSecret) {
        event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
      } else {
        event = JSON.parse(payload.toString()) as Stripe.Event;
      }

      await WebhookHandlers.handlePaymentEvent(event);
    } catch (err: unknown) {
      // Don't throw — stripe-replit-sync already handled the sync portion
      console.error("[Webhook] App-level handler error:", (err as Error).message);
    }
  }

  static async handlePaymentEvent(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const pi = event.data.object as Stripe.PaymentIntent;
        const { jobId, serviceRequestId } = pi.metadata || {};

        console.log(`[Webhook] payment_intent.succeeded — PI: ${pi.id}, job: ${jobId}`);

        if (jobId) {
          const jobPayments = await storage.getPaymentsByJobId(jobId);
          const incoming = jobPayments.find(p => p.type === "incoming");
          if (incoming && incoming.status !== "paid") {
            await storage.updatePayment(incoming.id, {
              status: "paid",
              paidAt: new Date(),
              stripePaymentIntentId: pi.id,
            });
          }
          if (serviceRequestId) {
            await storage.updateServiceRequest(serviceRequestId, { paymentStatus: "paid" });
          }
        }
        break;
      }

      case "payment_intent.payment_failed": {
        const pi = event.data.object as Stripe.PaymentIntent;
        const { jobId, serviceRequestId } = pi.metadata || {};
        const failureMsg = pi.last_payment_error?.message || "Unknown error";

        console.error(`[Webhook] payment_intent.payment_failed — PI: ${pi.id}, job: ${jobId}, reason: ${failureMsg}`);

        if (jobId) {
          const jobPayments = await storage.getPaymentsByJobId(jobId);
          const incoming = jobPayments.find(p => p.type === "incoming");
          if (incoming) {
            await storage.updatePayment(incoming.id, {
              status: "failed",
              stripePaymentIntentId: pi.id,
            });
          }

          const admins = await storage.getUsersByRole("admin");
          const job = await storage.getJob(jobId);
          await Promise.all(admins.map(admin =>
            storage.createNotification({
              userId: admin.userId,
              title: "⚠️ Payment charge failed",
              message: `Card charge failed for job at ${job?.propertyAddress || jobId}. Reason: ${failureMsg}. Follow up with the client.`,
              type: "job_assigned",
              jobId: jobId || undefined,
              serviceRequestId: serviceRequestId || undefined,
            })
          ));
        }
        break;
      }

      case "account.updated": {
        const account = event.data.object as Stripe.Account;
        if (account.charges_enabled && account.payouts_enabled) {
          const userId = account.metadata?.userId;
          if (userId) {
            await storage.updateContractorOnboarding(userId, { stripeOnboardingComplete: true });
            console.log(`[Webhook] Stripe Connect onboarding complete for user ${userId}`);
          }
        }
        break;
      }

      default:
        break;
    }
  }
}
