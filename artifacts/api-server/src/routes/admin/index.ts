import { Router, type IRouter, type Request, type Response } from "express";
import { db, sessionsTable, auditLogsTable } from "@workspace/db";
import { eq, gt, desc } from "drizzle-orm";
import { deleteSession } from "../../lib/auth";
import { logAudit } from "../../lib/audit";

const router: IRouter = Router();

function requireAdmin(req: Request, res: Response, next: () => void) {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Não autenticado." });
    return;
  }
  if (req.user?.role !== "Administrador") {
    res.status(403).json({ error: "Acesso restrito a Administradores." });
    return;
  }
  next();
}

router.get("/admin/sessions", requireAdmin, async (_req: Request, res: Response) => {
  const now = new Date();
  const rows = await db
    .select()
    .from(sessionsTable)
    .where(gt(sessionsTable.expire, now));

  const sessions = rows.map((row) => {
    const sess = row.sess as Record<string, unknown>;
    const user = sess["user"] as Record<string, unknown> | undefined;
    return {
      sid: row.sid.slice(0, 8) + "…",
      fullSid: row.sid,
      isDemo: Boolean(sess["isDemo"]),
      expire: row.expire,
      user: user
        ? {
            id: user["id"],
            email: user["email"],
            firstName: user["firstName"],
            lastName: user["lastName"],
            role: user["role"] ?? "—",
          }
        : null,
    };
  });

  res.json({ sessions });
});

router.delete("/admin/sessions/:sid", requireAdmin, async (req: Request, res: Response) => {
  const { sid } = req.params;

  const [row] = await db
    .select()
    .from(sessionsTable)
    .where(eq(sessionsTable.sid, sid));

  if (!row) {
    res.status(404).json({ error: "Sessão não encontrada." });
    return;
  }

  await deleteSession(sid);

  const sess = row.sess as Record<string, unknown>;
  const targetUser = sess["user"] as Record<string, unknown> | undefined;

  void logAudit(req, "session_revoke", {
    userId: req.user?.id,
    userEmail: req.user?.email ?? undefined,
    userRole: req.user?.role,
    details: `Sessão revogada do utilizador ${targetUser?.["email"] ?? sid.slice(0, 8)}`,
  });

  res.json({ success: true });
});

router.get("/admin/audit", requireAdmin, async (_req: Request, res: Response) => {
  const logs = await db
    .select()
    .from(auditLogsTable)
    .orderBy(desc(auditLogsTable.createdAt))
    .limit(100);
  res.json({ logs });
});

export default router;
