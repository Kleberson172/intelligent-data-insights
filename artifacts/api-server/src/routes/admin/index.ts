import bcrypt from "bcryptjs";
import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";
import { db, sessionsTable, auditLogsTable, usersTable } from "@workspace/db";
import { eq, gt, desc } from "drizzle-orm";
import { deleteSession } from "../../lib/auth";
import { logAudit } from "../../lib/audit";

const router: IRouter = Router();

function requireAdmin(req: Request, res: Response, next: () => void) {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Nao autenticado." });
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
      sid: row.sid.slice(0, 8) + "...",
      fullSid: row.sid,
      isDemo: Boolean(sess["isDemo"]),
      expire: row.expire,
      user: user
        ? {
            id: user["id"],
            email: user["email"],
            firstName: user["firstName"],
            lastName: user["lastName"],
            role: user["role"] ?? "-",
          }
        : null,
    };
  });

  res.json({ sessions });
});

router.delete("/admin/sessions/:sid", requireAdmin, async (req: Request, res: Response) => {
  const sid = String(req.params.sid);

  const [row] = await db
    .select()
    .from(sessionsTable)
    .where(eq(sessionsTable.sid, sid));

  if (!row) {
    res.status(404).json({ error: "Sessao nao encontrada." });
    return;
  }

  await deleteSession(sid);

  const sess = row.sess as Record<string, unknown>;
  const targetUser = sess["user"] as Record<string, unknown> | undefined;

  void logAudit(req, "session_revoke", {
    userId: req.user?.id,
    userEmail: req.user?.email ?? undefined,
    userRole: req.user?.role,
    details: `Sessao revogada do utilizador ${targetUser?.["email"] ?? sid.slice(0, 8)}`,
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

router.get("/admin/users", requireAdmin, async (_req: Request, res: Response) => {
  const rows = await db
    .select({
      id: usersTable.id,
      email: usersTable.email,
      firstName: usersTable.firstName,
      lastName: usersTable.lastName,
      role: usersTable.role,
      createdAt: usersTable.createdAt,
    })
    .from(usersTable)
    .orderBy(desc(usersTable.createdAt));

  res.json({ users: rows });
});

const CreateUserBody = z.object({
  email: z.string().email(),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres."),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: z.enum(["Analista", "Administrador"]),
});

router.post("/admin/users", requireAdmin, async (req: Request, res: Response) => {
  const parsed = CreateUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Dados invalidos." });
    return;
  }

  const { email, password, firstName, lastName, role } = parsed.data;

  const [existing] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email.toLowerCase()));

  if (existing) {
    res.status(409).json({ error: "Ja existe um utilizador com este email." });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const [newUser] = await db
    .insert(usersTable)
    .values({
      email: email.toLowerCase(),
      password: passwordHash,
      firstName,
      lastName,
      role,
    })
    .returning({
      id: usersTable.id,
      email: usersTable.email,
      firstName: usersTable.firstName,
      lastName: usersTable.lastName,
      role: usersTable.role,
      createdAt: usersTable.createdAt,
    });

  void logAudit(req, "user_create", {
    userId: req.user?.id,
    userEmail: req.user?.email ?? undefined,
    userRole: req.user?.role,
    details: `Utilizador criado: ${email}`,
  });

  res.status(201).json({ user: newUser });
});

const UpdateUserBody = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  role: z.enum(["Analista", "Administrador"]).optional(),
  password: z.string().min(6).optional(),
});

router.patch("/admin/users/:id", requireAdmin, async (req: Request, res: Response) => {
  const id = String(req.params.id);
  const parsed = UpdateUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Dados invalidos." });
    return;
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (parsed.data.firstName) updates["firstName"] = parsed.data.firstName;
  if (parsed.data.lastName) updates["lastName"] = parsed.data.lastName;
  if (parsed.data.role) updates["role"] = parsed.data.role;
  if (parsed.data.password) updates["password"] = await bcrypt.hash(parsed.data.password, 10);

  const [updated] = await db
    .update(usersTable)
    .set(updates)
    .where(eq(usersTable.id, id))
    .returning({
      id: usersTable.id,
      email: usersTable.email,
      firstName: usersTable.firstName,
      lastName: usersTable.lastName,
      role: usersTable.role,
      createdAt: usersTable.createdAt,
    });

  if (!updated) {
    res.status(404).json({ error: "Utilizador nao encontrado." });
    return;
  }

  void logAudit(req, "user_update", {
    userId: req.user?.id,
    userEmail: req.user?.email ?? undefined,
    userRole: req.user?.role,
    details: `Utilizador atualizado: ${updated.email}`,
  });

  res.json({ user: updated });
});

router.delete("/admin/users/:id", requireAdmin, async (req: Request, res: Response) => {
  const id = String(req.params.id);

  if (id === req.user?.id) {
    res.status(400).json({ error: "Nao pode eliminar a sua propria conta." });
    return;
  }

  const [deleted] = await db
    .delete(usersTable)
    .where(eq(usersTable.id, id))
    .returning({ email: usersTable.email });

  if (!deleted) {
    res.status(404).json({ error: "Utilizador nao encontrado." });
    return;
  }

  void logAudit(req, "user_delete", {
    userId: req.user?.id,
    userEmail: req.user?.email ?? undefined,
    userRole: req.user?.role,
    details: `Utilizador eliminado: ${deleted.email}`,
  });

  res.json({ success: true });
});

export default router;
