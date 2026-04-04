import { storage } from "../storage";
import { ZodError } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";

export const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

export const upload = multer({
  dest: uploadDir,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/heic"];
    cb(null, allowed.includes(file.mimetype));
  },
});

export function handleZodError(err: unknown): string {
  if (err instanceof ZodError) {
    return err.errors.map((e) => e.message).join(", ");
  }
  return (err as Error).message;
}

export function getUserId(req: any): string {
  return req.user?.claims?.sub;
}

export async function isAdmin(req: any): Promise<boolean> {
  const userId = getUserId(req);
  if (!userId) return false;
  const profile = await storage.getUserProfile(userId);
  return profile?.role === "admin";
}

export async function isContractor(req: any): Promise<boolean> {
  const userId = getUserId(req);
  if (!userId) return false;
  const profile = await storage.getUserProfile(userId);
  return profile?.role === "contractor";
}

export async function isAuthorizedForJob(job: any, userId: string, role: string): Promise<boolean> {
  if (role === "admin") return true;

  if (role === "contractor") {
    if (!job.cleanerId) return false;
    const cleaner = await storage.getCleanerByUserId(userId);
    return cleaner?.id === job.cleanerId;
  }

  if (role === "client") {
    if (job.serviceRequestId) {
      const sr = await storage.getServiceRequest(job.serviceRequestId);
      return sr?.userId === userId;
    }
    const client = await storage.getClientByUserId(userId);
    return client?.id === job.clientId;
  }

  return false;
}
