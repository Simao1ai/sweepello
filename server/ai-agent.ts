import type { Express } from "express";
import OpenAI from "openai";
import { isAuthenticated } from "./replit_integrations/auth";
import { storage } from "./storage";
import { db } from "./db";
import { jobs, cleaners, clients, serviceRequests } from "@shared/schema";
import { eq, gte, count, desc } from "drizzle-orm";
import { broadcastJobOffers, acceptJobOffer } from "./matching";
import { sendToUser } from "./ws";

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

async function getLiveSnapshot(): Promise<string> {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const [todayCount, pendingCount, inProgressCount, monthCount, allCleaners, clientCount, pendingReqCount] =
      await Promise.all([
        db.select({ count: count() }).from(jobs).where(gte(jobs.scheduledDate, todayStart)),
        db.select({ count: count() }).from(jobs).where(eq(jobs.status, "pending")),
        db.select({ count: count() }).from(jobs).where(eq(jobs.status, "in_progress")),
        db.select({ count: count() }).from(jobs).where(gte(jobs.scheduledDate, monthStart)),
        db.select().from(cleaners).limit(100),
        db.select({ count: count() }).from(clients),
        db.select({ count: count() }).from(serviceRequests).where(eq(serviceRequests.status, "pending")),
      ]);
    const online = allCleaners.filter(c => c.isOnline).length;
    return `Snapshot (${now.toLocaleString()}): jobs_today=${todayCount[0]?.count}, pending_jobs=${pendingCount[0]?.count}, in_progress=${inProgressCount[0]?.count}, completed_this_month=${monthCount[0]?.count}, total_cleaners=${allCleaners.length} (${online} online), total_clients=${clientCount[0]?.count}, pending_service_requests=${pendingReqCount[0]?.count}`;
  } catch {
    return "Live snapshot unavailable.";
  }
}

const SYSTEM_PROMPT = `You are Sweepo, the autonomous AI operations manager for Sweepello — a nationwide cleaning brokerage platform.

You can fully manage the admin account. You have tools to read data AND perform real actions:
- List and inspect jobs, service requests, cleaners, clients, applications, disputes
- Assign cleaners to service requests
- Broadcast job offers to matching cleaners
- Approve or reject contractor applications (sends email automatically)
- Resolve disputes with notes
- Update job statuses
- Send notifications directly to users

BUSINESS RULES:
- 30% brokerage margin on all jobs; minimum $120/job
- Matching: zip code → availability → rating → on-time %
- Preferred cleaner gets first offer; 30-min offer expiry
- Job workflow: pending → broadcasting → assigned → in_progress → completed
- Contractor onboarding: 5 steps (business → agreement → W-9 → insurance → Stripe Connect)

OPERATING STYLE:
- When asked to do something, do it directly using your tools — don't just describe it
- After taking an action, confirm what you did and any important outcome
- If a request needs more info (e.g., "assign a cleaner" without specifying which job), use list tools first to get context, then proceed
- Be decisive and efficient — you are running this operation
- Flag anything that looks like a problem (overdue jobs, low-rated cleaners, unresolved disputes)

Always respond in plain, direct English. You are an operator, not a chatbot.`;

// ─── Tool definitions ────────────────────────────────────────────────────────

const TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "list_service_requests",
      description: "List service requests, optionally filtered by status.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["pending", "broadcasting", "confirmed", "in_progress", "completed", "cancelled", "all"], description: "Filter by status. Defaults to 'all'." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_jobs",
      description: "List cleaning jobs, optionally filtered by status.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["pending", "broadcasting", "assigned", "in_progress", "completed", "cancelled", "all"], description: "Filter by status." },
          limit: { type: "number", description: "Max results to return (default 20)." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_cleaners",
      description: "List all cleaners with their ratings, job counts, service areas, and online status.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "list_clients",
      description: "List all clients.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "list_applications",
      description: "List contractor applications, optionally filtered by status.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["pending", "approved", "rejected", "waitlisted", "all"], description: "Filter by status." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_disputes",
      description: "List disputes, optionally filtered by status.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["open", "investigating", "resolved", "all"] },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_job_details",
      description: "Get full details of a specific job by ID.",
      parameters: {
        type: "object",
        properties: { job_id: { type: "string", description: "The job ID." } },
        required: ["job_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "broadcast_job_offers",
      description: "Broadcast a service request to matching available cleaners, sorted by rating. Creates job offers with 30-min expiry.",
      parameters: {
        type: "object",
        properties: { service_request_id: { type: "string", description: "The service request ID to broadcast." } },
        required: ["service_request_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "assign_cleaner_to_request",
      description: "Directly assign a specific cleaner to a service request, skipping the offer process. Creates the job immediately.",
      parameters: {
        type: "object",
        properties: {
          service_request_id: { type: "string", description: "The service request ID." },
          cleaner_id: { type: "string", description: "The cleaner ID to assign." },
        },
        required: ["service_request_id", "cleaner_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_job_status",
      description: "Update the status of a job.",
      parameters: {
        type: "object",
        properties: {
          job_id: { type: "string" },
          status: { type: "string", enum: ["pending", "broadcasting", "assigned", "in_progress", "completed", "cancelled"] },
        },
        required: ["job_id", "status"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "approve_application",
      description: "Approve a contractor application. Sends an approval email and sets their account status to approved.",
      parameters: {
        type: "object",
        properties: { application_id: { type: "string" } },
        required: ["application_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "reject_application",
      description: "Reject a contractor application with an optional reason. Sends a rejection email.",
      parameters: {
        type: "object",
        properties: {
          application_id: { type: "string" },
          reason: { type: "string", description: "Optional rejection reason to include in the email." },
        },
        required: ["application_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "resolve_dispute",
      description: "Resolve an open dispute with resolution notes.",
      parameters: {
        type: "object",
        properties: {
          dispute_id: { type: "string" },
          resolution: { type: "string", description: "Resolution notes explaining how the dispute was resolved." },
        },
        required: ["dispute_id", "resolution"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "send_notification",
      description: "Send an in-app notification to a specific user (by userId).",
      parameters: {
        type: "object",
        properties: {
          user_id: { type: "string" },
          title: { type: "string" },
          message: { type: "string" },
        },
        required: ["user_id", "title", "message"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_dashboard_stats",
      description: "Get comprehensive dashboard statistics including revenue, job counts, ratings, and trends.",
      parameters: { type: "object", properties: {} },
    },
  },
];

// ─── Tool executor ────────────────────────────────────────────────────────────

async function executeTool(name: string, args: any): Promise<{ summary: string; data: any }> {
  try {
    switch (name) {
      case "list_service_requests": {
        const all = await storage.getServiceRequests();
        const filtered = args.status && args.status !== "all"
          ? all.filter(r => r.status === args.status)
          : all;
        const items = filtered.slice(0, 30).map(r => ({
          id: r.id, status: r.status, serviceType: r.serviceType,
          address: r.propertyAddress, date: r.requestedDate,
          clientId: r.clientId, assignedCleanerId: r.assignedCleanerId,
          isOnDemand: r.isOnDemand,
        }));
        return { summary: `Found ${filtered.length} service request(s)`, data: items };
      }

      case "list_jobs": {
        const all = await storage.getJobs();
        const filtered = args.status && args.status !== "all"
          ? all.filter(j => j.status === args.status)
          : all;
        const limit = args.limit || 20;
        const items = filtered.slice(0, limit).map(j => ({
          id: j.id, status: j.status, serviceType: j.serviceType,
          address: j.propertyAddress, scheduledDate: j.scheduledDate,
          cleanerId: j.cleanerId, clientId: j.clientId,
          clientPrice: j.clientPrice, subCost: j.subCost,
        }));
        return { summary: `Found ${filtered.length} job(s)`, data: items };
      }

      case "list_cleaners": {
        const all = await storage.getCleaners();
        const items = all.map(c => ({
          id: c.id, name: c.name, email: c.email,
          rating: c.averageRating, totalJobs: c.totalJobs,
          serviceAreas: c.serviceZipCodes, isOnline: c.isOnline,
          isActive: c.isActive, isFeatured: c.isFeatured,
        }));
        return { summary: `${all.length} cleaner(s) total, ${all.filter(c => c.isOnline).length} online`, data: items };
      }

      case "list_clients": {
        const all = await storage.getClients();
        const items = all.map(c => ({
          id: c.id, name: c.name, email: c.email,
          phone: c.phone, propertyCount: 1,
          isActive: c.isActive, isVip: c.isVip,
          rating: (c as any).clientRating,
        }));
        return { summary: `${all.length} client(s)`, data: items };
      }

      case "list_applications": {
        const all = await storage.getContractorApplications();
        const filtered = args.status && args.status !== "all"
          ? all.filter((a: any) => a.status === args.status)
          : all;
        return { summary: `${filtered.length} application(s)`, data: filtered.slice(0, 20) };
      }

      case "list_disputes": {
        const all = await storage.getDisputes();
        const filtered = args.status && args.status !== "all"
          ? all.filter((d: any) => d.status === args.status)
          : all;
        return { summary: `${filtered.length} dispute(s)`, data: filtered.slice(0, 20) };
      }

      case "get_job_details": {
        const job = await storage.getJob(args.job_id);
        if (!job) return { summary: `Job ${args.job_id} not found`, data: null };
        return { summary: `Job ${job.id} details retrieved`, data: job };
      }

      case "broadcast_job_offers": {
        const req = await storage.getServiceRequest(args.service_request_id);
        if (!req) return { summary: "Service request not found", data: null };
        const count = await broadcastJobOffers(args.service_request_id);
        await storage.updateServiceRequest(args.service_request_id, { status: "broadcasting" });
        return { summary: `Broadcast sent to ${count} cleaner(s) for request ${args.service_request_id}`, data: { count, requestId: args.service_request_id } };
      }

      case "assign_cleaner_to_request": {
        const req = await storage.getServiceRequest(args.service_request_id);
        const cleaner = await storage.getCleaner(args.cleaner_id);
        if (!req) return { summary: "Service request not found", data: null };
        if (!cleaner) return { summary: "Cleaner not found", data: null };

        const updated = await storage.updateServiceRequest(args.service_request_id, {
          assignedCleanerId: args.cleaner_id,
          status: "confirmed",
        });

        const job = await storage.createJob({
          serviceRequestId: args.service_request_id,
          clientId: req.clientId,
          cleanerId: args.cleaner_id,
          serviceType: req.serviceType,
          propertyAddress: req.propertyAddress || "",
          scheduledDate: req.requestedDate,
          status: "assigned",
          clientPrice: req.clientPrice || "0",
          subCost: req.subCost || "0",
          bedrooms: req.bedrooms || 0,
          bathrooms: req.bathrooms || 0,
          squareFootage: req.squareFootage || 0,
          propertyType: req.propertyType || "residential",
        });

        if (cleaner.userId) {
          await storage.createNotification({
            userId: cleaner.userId,
            title: "New Job Assigned",
            message: `You have been directly assigned to a ${req.serviceType} cleaning at ${req.propertyAddress}`,
            type: "job_assigned",
            jobId: job.id,
          });
          sendToUser(cleaner.userId, { type: "job_assigned", jobId: job.id });
        }

        return {
          summary: `Cleaner ${cleaner.name} assigned to request ${args.service_request_id}. Job #${job.id} created.`,
          data: { job, cleaner: { id: cleaner.id, name: cleaner.name } },
        };
      }

      case "update_job_status": {
        const job = await storage.updateJob(args.job_id, { status: args.status });
        if (!job) return { summary: "Job not found", data: null };
        return { summary: `Job ${args.job_id} status updated to "${args.status}"`, data: job };
      }

      case "approve_application": {
        const app = await storage.updateContractorApplication(args.application_id, { status: "approved" });
        if (!app) return { summary: "Application not found", data: null };
        try {
          const { sendApplicationApprovedEmail } = await import("./sendgrid");
          await sendApplicationApprovedEmail(app.email, app.firstName);
        } catch (emailErr: unknown) {
          console.error("[AI Agent] Failed to send approval email:", (emailErr as Error).message);
        }
        return { summary: `Application ${args.application_id} approved. Email sent to ${(app as any).email}.`, data: app };
      }

      case "reject_application": {
        const app = await storage.updateContractorApplication(args.application_id, {
          status: "rejected",
          adminNote: args.reason || undefined,
        });
        if (!app) return { summary: "Application not found", data: null };
        try {
          const { sendApplicationRejectedEmail } = await import("./sendgrid");
          await sendApplicationRejectedEmail((app as any).email, (app as any).firstName, args.reason);
        } catch (emailErr: unknown) {
          console.error("[AI Agent] Failed to send rejection email:", (emailErr as Error).message);
        }
        return { summary: `Application ${args.application_id} rejected.`, data: app };
      }

      case "resolve_dispute": {
        const dispute = await storage.updateDispute(args.dispute_id, {
          status: "resolved",
          resolution: args.resolution,
          resolvedAt: new Date(),
        });
        if (!dispute) return { summary: "Dispute not found", data: null };
        return { summary: `Dispute ${args.dispute_id} resolved: "${args.resolution}"`, data: dispute };
      }

      case "send_notification": {
        const notif = await storage.createNotification({
          userId: args.user_id,
          title: args.title,
          message: args.message,
          type: "general",
        });
        sendToUser(args.user_id, { type: "notification", notification: notif });
        return { summary: `Notification sent to user ${args.user_id}: "${args.title}"`, data: notif };
      }

      case "get_dashboard_stats": {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const [allJobs, allCleaners, allClients, allRequests] = await Promise.all([
          storage.getJobs(),
          storage.getCleaners(),
          storage.getClients(),
          storage.getServiceRequests(),
        ]);
        const completedJobs = allJobs.filter(j => j.status === "completed");
        const monthJobs = completedJobs.filter(j => new Date(j.scheduledDate) >= monthStart);
        const totalRevenue = completedJobs.reduce((sum, j) => sum + parseFloat(j.clientPrice || "0"), 0);
        const monthRevenue = monthJobs.reduce((sum, j) => sum + parseFloat(j.clientPrice || "0"), 0);
        const avgRating = allCleaners.length
          ? allCleaners.reduce((s, c) => s + parseFloat(c.averageRating || "0"), 0) / allCleaners.length
          : 0;
        return {
          summary: "Dashboard stats retrieved",
          data: {
            totalRevenue: totalRevenue.toFixed(2),
            monthRevenue: monthRevenue.toFixed(2),
            totalJobs: allJobs.length,
            completedJobs: completedJobs.length,
            pendingJobs: allJobs.filter(j => j.status === "pending").length,
            inProgressJobs: allJobs.filter(j => j.status === "in_progress").length,
            totalCleaners: allCleaners.length,
            onlineCleaners: allCleaners.filter(c => c.isOnline).length,
            totalClients: allClients.length,
            pendingRequests: allRequests.filter(r => r.status === "pending").length,
            avgCleanerRating: avgRating.toFixed(2),
          },
        };
      }

      default:
        return { summary: `Unknown tool: ${name}`, data: null };
    }
  } catch (err: any) {
    console.error(`[AI Agent] Tool ${name} failed:`, err);
    return { summary: `Error in ${name}: ${err.message}`, data: null };
  }
}

// ─── Route ────────────────────────────────────────────────────────────────────

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

      const snapshot = await getLiveSnapshot();
      const adminUserId = req.user?.claims?.sub;
      const firstUserMsg = chatMessages.find((m: any) => m.role === "user")?.content?.slice(0, 200);

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const openaiMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        { role: "system", content: `${SYSTEM_PROMPT}\n\nCURRENT STATUS: ${snapshot}` },
        ...chatMessages.map((m: any) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      ];

      // Accumulate token usage across all rounds
      let totalPromptTokens = 0;
      let totalCompletionTokens = 0;

      // Tool-calling loop (max 5 rounds)
      let rounds = 0;
      while (rounds < 5) {
        rounds++;
        const response = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: openaiMessages,
          tools: TOOLS,
          tool_choice: "auto",
          max_tokens: 2048,
        });

        // Accumulate token counts
        if (response.usage) {
          totalPromptTokens += response.usage.prompt_tokens;
          totalCompletionTokens += response.usage.completion_tokens;
        }

        const choice = response.choices[0];

        if (choice.finish_reason === "tool_calls" && choice.message.tool_calls?.length) {
          openaiMessages.push(choice.message);

          const toolResults: OpenAI.Chat.Completions.ChatCompletionToolMessageParam[] = [];

          for (const toolCall of choice.message.tool_calls) {
            const toolName = toolCall.function.name;
            let toolArgs: any = {};
            try { toolArgs = JSON.parse(toolCall.function.arguments); } catch {}

            const result = await executeTool(toolName, toolArgs);

            // Send action event to frontend
            res.write(`data: ${JSON.stringify({
              type: "action",
              tool: toolName,
              summary: result.summary,
            })}\n\n`);

            toolResults.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: JSON.stringify({ summary: result.summary, data: result.data }),
            });
          }

          openaiMessages.push(...toolResults);
          continue;
        }

        // Final text response — stream word by word (no extra API call)
        if (choice.message.content) {
          const words = choice.message.content.split(" ");
          for (let i = 0; i < words.length; i++) {
            const chunk = (i === 0 ? "" : " ") + words[i];
            res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
            await new Promise(r => setTimeout(r, 12));
          }
        }
        break;
      }

      // Calculate cost: GPT-4o = $5/1M input, $15/1M output
      const totalTokens = totalPromptTokens + totalCompletionTokens;
      const costUsd = ((totalPromptTokens * 0.000005) + (totalCompletionTokens * 0.000015)).toFixed(8);

      // Save usage log (fire and forget)
      storage.createAiUsageLog({
        adminUserId,
        model: "gpt-4o",
        promptTokens: totalPromptTokens,
        completionTokens: totalCompletionTokens,
        totalTokens,
        costUsd,
        rounds,
        userMessage: firstUserMsg,
      }).catch(err => console.error("[AI Agent] Failed to save usage log:", err));

      res.write(`data: ${JSON.stringify({ done: true, usage: { promptTokens: totalPromptTokens, completionTokens: totalCompletionTokens, totalTokens, costUsd } })}\n\n`);
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
