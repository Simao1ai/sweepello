import { type Express } from "express";
import { storage } from "../storage";
import { isAuthenticated, authStorage } from "../replit_integrations/auth";
import { insertUserProfileSchema } from "@shared/schema";
import { getUserId, handleZodError } from "./helpers";

export function registerAuthRoutes(app: Express) {
  // === DEV-ONLY LOGIN SWITCHER (never available in production) ===
  if (process.env.NODE_ENV !== "production") {
    app.get("/api/dev/users", async (_req, res) => {
      const allProfiles = await storage.getAllUserProfiles();
      const users = await Promise.all(
        allProfiles.map(async (p) => {
          const user = await authStorage.getUser(p.userId);
          return {
            id: p.userId,
            name: [user?.firstName, user?.lastName].filter(Boolean).join(" ") || p.userId,
            email: user?.email || "",
            role: p.role,
            approvalStatus: p.approvalStatus,
          };
        })
      );
      res.json(users);
    });

    app.post("/api/dev/login", async (req, res) => {
      const { userId } = req.body;
      if (!userId) return res.status(400).json({ message: "userId required" });
      const user = await authStorage.getUser(userId);
      if (!user) return res.status(404).json({ message: "User not found" });
      const fakeUser = {
        claims: {
          sub: user.id,
          email: user.email || "",
          first_name: user.firstName || "",
          last_name: user.lastName || "",
          exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
        },
        access_token: "dev-token",
        refresh_token: null,
        expires_at: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
      };
      req.login(fakeUser, (err) => {
        if (err) return res.status(500).json({ message: "Login failed", error: String(err) });
        res.json({ ok: true, userId: user.id, role: "switching..." });
      });
    });

    app.post("/api/dev/logout", (req, res) => {
      req.logout(() => {
        req.session.destroy(() => {
          res.json({ ok: true });
        });
      });
    });
  }

  // === USER PROFILE ROUTES ===
  app.get("/api/profile", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    const profile = await storage.getUserProfile(userId);
    res.json(profile || null);
  });

  app.post("/api/profile", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const existing = await storage.getUserProfile(userId);
      if (existing) {
        const { role: _ignoredRole, approvalStatus: _ignored2, ...safeBody } = req.body;
        const updated = await storage.updateUserProfile(userId, safeBody);
        if (existing.role === "client") {
          const clientRecord = await storage.getClientByUserId(userId);
          if (clientRecord) {
            const patch: Record<string, any> = {};
            if (safeBody.address !== undefined) patch.propertyAddress = safeBody.address;
            if (safeBody.city !== undefined) patch.city = safeBody.city;
            if (safeBody.zipCode !== undefined) patch.zipCode = safeBody.zipCode;
            if (Object.keys(patch).length > 0) await storage.updateClient(clientRecord.id, patch);
          }
        }
        return res.json(updated);
      }
      const allowedRoles = ["client", "contractor"];
      const chosenRole = allowedRoles.includes(req.body.role) ? req.body.role : "client";
      const { role: _ignored, ...rest } = req.body;
      const approvalStatus = chosenRole === "contractor" ? "pending" : "approved";
      const validated = insertUserProfileSchema.parse({ ...rest, userId, role: chosenRole, approvalStatus });
      const profile = await storage.createUserProfile(validated);

      if (chosenRole === "contractor") {
        const allProfiles = await storage.getAllUserProfiles();
        const adminProfiles = allProfiles.filter(p => p.role === "admin");
        const claims = (req as any).user?.claims || {};
        const displayName = claims.name || claims.email || "A new contractor";
        await Promise.all(adminProfiles.map(p =>
          storage.createNotification({
            userId: p.userId,
            title: "New contractor account pending approval",
            message: `${displayName} has signed up as a contractor and is waiting for your approval. Review them in Applications.`,
            type: "contractor_pending",
          })
        ));
      }

      if (chosenRole === "client") {
        const authUser = await authStorage.getUser(userId);
        const fullName = [authUser?.firstName, authUser?.lastName].filter(Boolean).join(" ") || authUser?.email || "New Client";
        const existingClient = await storage.getClientByUserId(userId);
        if (!existingClient) {
          await storage.createClient({
            userId,
            name: fullName,
            email: authUser?.email || undefined,
            propertyAddress: (validated as any).address || "Address not provided",
            city: (validated as any).city || undefined,
            zipCode: (validated as any).zipCode || undefined,
            propertyType: "residential",
          });
        }
      }

      res.json(profile);
    } catch (err: unknown) {
      res.status(400).json({ message: handleZodError(err) });
    }
  });
}
