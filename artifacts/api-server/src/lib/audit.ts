import { db, auditLogsTable } from "@workspace/db";
import type { Request } from "express";

export async function logAudit(
  req: Request,
  action: string,
  opts?: {
    userId?: string;
    userEmail?: string;
    userRole?: string;
    details?: string;
  },
) {
  const ip =
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    req.socket.remoteAddress ||
    null;

  await db.insert(auditLogsTable).values({
    userId: opts?.userId ?? null,
    userEmail: opts?.userEmail ?? null,
    userRole: opts?.userRole ?? null,
    action,
    details: opts?.details ?? null,
    ip,
  });
}
