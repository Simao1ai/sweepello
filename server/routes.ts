import { type Express } from "express";
import { type Server } from "http";
import { registerAuthRoutes } from "./routes/auth";
import { registerClientRoutes } from "./routes/client";
import { registerAdminRoutes } from "./routes/admin";
import { registerContractorRoutes } from "./routes/contractor";
import { registerPlatformRoutes } from "./routes/platform";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  registerAuthRoutes(app);
  registerClientRoutes(app);
  registerAdminRoutes(app);
  registerContractorRoutes(app);
  registerPlatformRoutes(app);

  return httpServer;
}
