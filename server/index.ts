import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { setupAuth, registerAuthRoutes } from "./replit_integrations/auth";
import { runMigrations } from 'stripe-replit-sync';
import { getStripeSync } from './stripeClient';
import { WebhookHandlers } from './webhookHandlers';
import { setupWebSocket } from "./ws";
import { registerAiAgentRoutes } from "./ai-agent";
import { db } from "./db";
import { sql } from "drizzle-orm";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

async function initStripe() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.warn('DATABASE_URL not set, skipping Stripe init');
    return;
  }
  try {
    console.log('Initializing Stripe schema...');
    await runMigrations({ databaseUrl, schema: 'stripe' });
    console.log('Stripe schema ready');

    const stripeSync = await getStripeSync();

    const domains = process.env.REPLIT_DOMAINS;
    if (domains) {
      const webhookBaseUrl = `https://${domains.split(',')[0]}`;
      try {
        const result = await stripeSync.findOrCreateManagedWebhook(
          `${webhookBaseUrl}/api/stripe/webhook`
        );
        if (result?.webhook) {
          console.log(`Webhook configured: ${result.webhook.url}`);
        }
      } catch (webhookErr: any) {
        console.warn('Webhook setup skipped:', webhookErr.message);
      }
    } else {
      console.warn('REPLIT_DOMAINS not set, skipping webhook setup');
    }

    stripeSync.syncBackfill()
      .then(() => console.log('Stripe data synced'))
      .catch((err: any) => console.error('Stripe sync error:', err));
  } catch (error) {
    console.error('Failed to initialize Stripe:', error);
  }
}

const OWNER_USER_ID = "52853713";

async function ensureAdminUser() {
  const { db } = await import("./db");
  const { userProfiles } = await import("@shared/schema");
  const { eq } = await import("drizzle-orm");

  const [existing] = await db.select().from(userProfiles).where(eq(userProfiles.userId, OWNER_USER_ID));
  if (!existing) {
    await db.insert(userProfiles).values({ userId: OWNER_USER_ID, role: "admin" });
    console.log(`[startup] Created admin profile for owner (${OWNER_USER_ID})`);
  } else if (existing.role !== "admin") {
    await db.update(userProfiles).set({ role: "admin" }).where(eq(userProfiles.userId, OWNER_USER_ID));
    console.log(`[startup] Fixed admin role for owner (${OWNER_USER_ID}), was: ${existing.role}`);
  } else {
    console.log(`[startup] Owner admin role verified (${OWNER_USER_ID})`);
  }
}

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

(async () => {
  await initStripe();

  // === SECURITY HARDENING ===

  // 1. HTTP security headers (helmet)
  // CSP is kept permissive enough for Vite, Stripe Elements, Leaflet CDN, and Replit Auth.
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://js.stripe.com", "https://unpkg.com", "https://cdn.jsdelivr.net"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "blob:", "https:"],
        connectSrc: ["'self'", "wss:", "ws:", "https://api.stripe.com", "https://*.replit.com", "https://*.replit.dev"],
        frameSrc: ["'self'", "https://js.stripe.com"],
        workerSrc: ["'self'", "blob:"],
      },
    },
    crossOriginEmbedderPolicy: false, // Required for Leaflet/CDN resources
  }));

  // 2. Rate limiters — scoped by endpoint sensitivity
  const generalLimiter = rateLimit({
    windowMs: 60 * 1000,       // 1 minute
    max: 100,                   // 100 req/min per IP
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many requests, please slow down." },
    skip: (req) => process.env.NODE_ENV !== "production", // only enforce in prod
  });

  const authLimiter = rateLimit({
    windowMs: 60 * 1000,       // 1 minute
    max: 5,                     // 5 auth attempts per minute per IP
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many authentication attempts, try again later." },
    skip: (req) => process.env.NODE_ENV !== "production",
  });

  const aiLimiter = rateLimit({
    windowMs: 60 * 1000,        // 1 minute
    max: 15,                    // 15 AI calls/min per IP (GPT-4o is expensive)
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "AI rate limit reached. Please wait a moment." },
    skip: (req) => process.env.NODE_ENV !== "production",
  });

  const serviceRequestLimiter = rateLimit({
    windowMs: 60 * 1000,        // 1 minute
    max: 10,                    // 10 service requests/min per IP
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many requests. Please wait a moment." },
    skip: (req) => process.env.NODE_ENV !== "production",
  });

  // Apply general limiter to all API routes
  app.use("/api", generalLimiter);

  // Scoped limiters for sensitive endpoints
  app.use("/api/auth", authLimiter);
  app.use("/api/admin/ai-agent", aiLimiter);
  app.use("/api/service-requests", serviceRequestLimiter);
  app.use("/api/contractor-applications", serviceRequestLimiter);

  app.post(
    '/api/stripe/webhook',
    express.raw({ type: 'application/json' }),
    async (req, res) => {
      const signature = req.headers['stripe-signature'];
      if (!signature) return res.status(400).json({ error: 'Missing signature' });
      try {
        const sig = Array.isArray(signature) ? signature[0] : signature;
        await WebhookHandlers.processWebhook(req.body as Buffer, sig);
        res.status(200).json({ received: true });
      } catch (error: any) {
        console.error('Webhook error:', error.message);
        res.status(400).json({ error: 'Webhook processing error' });
      }
    }
  );

  // 3. Body size limit — prevent large-payload DoS attacks
  app.use(
    express.json({
      limit: "1mb",
      verify: (req, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );

  app.use(express.urlencoded({ extended: false, limit: "1mb" }));

  // 4. Request logger — redact sensitive fields to prevent PII/token leakage in logs
  const SENSITIVE_KEYS = new Set([
    "password", "token", "secret", "stripeCustomerId", "stripePaymentMethodId",
    "stripeCardLast4", "stripeCardBrand", "stripeAccountId", "w9Signature",
    "agreementSignature", "ssn", "taxId", "clientSecret",
  ]);

  function redactSensitive(obj: any): any {
    if (!obj || typeof obj !== "object") return obj;
    if (Array.isArray(obj)) return obj.map(redactSensitive);
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(obj)) {
      out[k] = SENSITIVE_KEYS.has(k) ? "[REDACTED]" : redactSensitive(v);
    }
    return out;
  }

  app.use((req, res, next) => {
    const start = Date.now();
    const path = req.path;
    let capturedJsonResponse: Record<string, any> | undefined = undefined;

    const originalResJson = res.json;
    res.json = function (bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };

    res.on("finish", () => {
      const duration = Date.now() - start;
      if (path.startsWith("/api")) {
        let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
        if (capturedJsonResponse) {
          // Only log response bodies for non-2xx or when debugging; always redact sensitive fields
          const redacted = redactSensitive(capturedJsonResponse);
          const snippet = JSON.stringify(redacted).slice(0, 200);
          if (res.statusCode >= 400 || process.env.LOG_RESPONSES === "true") {
            logLine += ` :: ${snippet}`;
          }
        }
        log(logLine);
      }
    });

    next();
  });

  await setupAuth(app);

  // Dev-only: X-Dev-User-Id header overrides authentication
  if (process.env.NODE_ENV !== "production") {
    app.use(async (req: any, _res, next) => {
      const devUserId = req.headers["x-dev-user-id"] as string | undefined;
      if (devUserId) {
        const { authStorage } = await import("./replit_integrations/auth");
        const user = await authStorage.getUser(devUserId);
        if (user) {
          const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7;
          req.user = {
            claims: {
              sub: user.id,
              email: user.email || "",
              first_name: user.firstName || "",
              last_name: user.lastName || "",
              exp,
            },
            access_token: "dev-token",
            refresh_token: null,
            expires_at: exp,
          };
          req.isAuthenticated = () => true;
        }
      }
      next();
    });
  }

  registerAuthRoutes(app);
  registerAiAgentRoutes(app);
  setupWebSocket(httpServer);

  const { seedDatabase } = await import("./seed");
  await seedDatabase().catch((err) => console.error("Seed error:", err));
  await ensureAdminUser().catch((err) => console.error("Admin seed error:", err));

  // Fix 7: Backfill profit for any jobs that were created before profit computation was added.
  // profit = price - cleaner_pay. This is a one-time idempotent update that skips jobs with profit already set.
  await db.execute(sql`
    UPDATE jobs
    SET profit = ROUND((CAST(price AS numeric) - CAST(cleaner_pay AS numeric))::numeric, 2)
    WHERE profit IS NULL
      AND cleaner_pay IS NOT NULL
      AND price IS NOT NULL
  `).catch((err) => console.error("Profit backfill error:", err));

  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
