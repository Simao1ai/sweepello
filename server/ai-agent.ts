import type { Express } from "express";
import OpenAI from "openai";
import { isAuthenticated } from "./replit_integrations/auth";
import { storage } from "./storage";
import { db } from "./db";
import { jobs, cleaners, clients, serviceRequests, payments } from "@shared/schema";
import { eq, gte, count, sum, desc } from "drizzle-orm";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

async function isAdmin(req: any): Promise<boolean> {
  const userId = req.user?.claims?.sub;
  if (!userId) return false;
  const profile = await storage.getUserProfile(userId);
  return profile?.role === "admin";
}

async function getLiveContext(): Promise<string> {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalJobsToday,
      pendingJobs,
      activeJobs,
      completedJobsMonth,
      allCleaners,
      allClients,
      pendingRequests,
      recentJobs,
    ] = await Promise.all([
      db.select({ count: count() }).from(jobs).where(gte(jobs.scheduledDate, todayStart)),
      db.select({ count: count() }).from(jobs).where(eq(jobs.status, "pending")),
      db.select({ count: count() }).from(jobs).where(eq(jobs.status, "in_progress")),
      db.select({ count: count() }).from(jobs).where(gte(jobs.scheduledDate, monthStart)),
      db.select().from(cleaners).limit(50),
      db.select({ count: count() }).from(clients),
      db.select({ count: count() }).from(serviceRequests).where(eq(serviceRequests.status, "pending")),
      db.select().from(jobs).orderBy(desc(jobs.scheduledDate)).limit(10),
    ]);

    const onlineCleaners = allCleaners.filter(c => c.isOnline);
    const topCleaners = [...allCleaners]
      .sort((a, b) => parseFloat(b.averageRating || "0") - parseFloat(a.averageRating || "0"))
      .slice(0, 5)
      .map(c => `${c.name} (⭐ ${c.averageRating || "N/A"}, ${c.totalJobs || 0} jobs, areas: ${c.serviceZipCodes || "N/A"})`)
      .join("; ");

    const recentJobsList = recentJobs
      .map(j => `Job #${j.id}: ${j.serviceType} @ ${j.propertyAddress || "N/A"} — ${j.status} (${new Date(j.scheduledDate).toLocaleDateString()})`)
      .join("\n");

    return `
LIVE BUSINESS DATA (as of ${now.toLocaleString()}):
- Jobs today: ${totalJobsToday[0]?.count ?? 0}
- Pending jobs: ${pendingJobs[0]?.count ?? 0}
- In-progress jobs: ${activeJobs[0]?.count ?? 0}
- Completed jobs this month: ${completedJobsMonth[0]?.count ?? 0}
- Total clients: ${allClients[0]?.count ?? 0}
- Total cleaners: ${allCleaners.length} (${onlineCleaners.length} currently online)
- Pending service requests: ${pendingRequests[0]?.count ?? 0}
- Top rated cleaners: ${topCleaners || "None"}

RECENT JOBS:
${recentJobsList || "No recent jobs"}
    `.trim();
  } catch (err) {
    console.error("[AI Agent] Failed to fetch live context:", err);
    return "Live data temporarily unavailable.";
  }
}

const SYSTEM_PROMPT = `You are Sweepo, the AI dispatch assistant for Sweepello — a professional Airbnb turnover cleaning brokerage operating in the NJ Shore market.

Your role is to help the admin manage operations efficiently. You have deep knowledge of:
- The cleaning dispatch workflow (service requests → job offers → assignments → completion)
- The brokerage pricing model (30% margin, sqft-based pricing, surge multipliers)
- Cleaner matching algorithm (zip code, availability, rating, on-time %)
- Job statuses: pending → broadcasting → assigned → in_progress → completed
- Service types: standard, deep clean, move-out

BUSINESS CONTEXT:
- Market: NJ Shore (beach communities, Airbnb turnovers are time-sensitive)
- Margin: 30% brokerage margin on all jobs
- Matching: preferred cleaner gets first offer, then by rating
- Surge pricing: 1.0x–1.75x based on online cleaner / active request ratio
- Contractor onboarding: 5-step process (business info → agreement → W-9 → insurance → Stripe Connect)

CAPABILITIES:
- Analyze job performance and revenue trends
- Recommend cleaners for specific jobs based on ratings and service areas
- Explain pricing calculations
- Help draft communications to clients or cleaners
- Identify operational bottlenecks
- Answer questions about business data provided below

TONE: Professional, concise, and action-oriented. You're a co-pilot for a busy dispatch operation.`;

export function registerAiAgentRoutes(app: Express) {
  app.post("/api/admin/ai-agent", isAuthenticated, async (req: any, res) => {
    try {
      if (!(await isAdmin(req))) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { messages: chatMessages } = req.body;
      if (!Array.isArray(chatMessages) || chatMessages.length === 0) {
        return res.status(400).json({ message: "Messages array required" });
      }

      const liveContext = await getLiveContext();

      const systemMessage = {
        role: "system" as const,
        content: `${SYSTEM_PROMPT}\n\n${liveContext}`,
      };

      const openaiMessages = [
        systemMessage,
        ...chatMessages.map((m: any) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      ];

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const stream = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: openaiMessages,
        stream: true,
        max_tokens: 1024,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      }

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (err: any) {
      console.error("[AI Agent] Error:", err);
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ error: "AI agent error" })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ message: "AI agent error" });
      }
    }
  });
}
