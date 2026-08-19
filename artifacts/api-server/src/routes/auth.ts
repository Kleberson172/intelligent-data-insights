import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import { authenticator } from "otplib";
import QRCode from "qrcode";
import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";
import { db, usersTable, sessionsTable } from "@workspace/db";
import { eq, and, ne, sql } from "drizzle-orm";
import {
  clearSession,
  getSessionId,
  getSession,
  createSession,
  createPendingTwoFactorSession,
  getPendingTwoFactorSession,
  updateSessionUser,
  deleteSession,
  SESSION_COOKIE,
  SESSION_TTL,
  IS_PRODUCTION,
  type SessionData,
  type AuthUser,
} from "../lib/auth";
import { logAudit } from "../lib/audit";

const router: IRouter = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Demasiadas tentativas de login. Tenta novamente mais tarde." },
});

function setSessionCookie(res: Response, sid: string) {
  res.cookie(SESSION_COOKIE, sid, {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL,
  });
}

router.get("/auth/user", (req: Request, res: Response) => {
  res.json({ user: req.isAuthenticated() ? req.user : null });
});

const LoginBody = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post("/login", loginLimiter, async (req: Request, res: Response) => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Email e senha sao obrigatorios." });
    return;
  }

  const { email, password } = parsed.data;

  const [dbUser] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email.toLowerCase()));

  if (!dbUser || !dbUser.password) {
    res.status(401).json({ error: "Credenciais invalidas. Verifique o email e a senha." });
    return;
  }

  const passwordMatches = await bcrypt.compare(password, dbUser.password);
  if (!passwordMatches) {
    res.status(401).json({ error: "Credenciais invalidas. Verifique o email e a senha." });
    return;
  }

  if (dbUser.twoFactorEnabled) {
    const pendingToken = await createPendingTwoFactorSession(dbUser.id);
    res.json({ requires2FA: true, pendingToken });
    return;
  }

  const sessionData: SessionData = {
    user: {
      id: dbUser.id,
      email: dbUser.email,
      firstName: dbUser.firstName,
      lastName: dbUser.lastName,
      profileImageUrl: dbUser.profileImageUrl,
      role: dbUser.role as "Analista" | "Administrador",
      twoFactorEnabled: dbUser.twoFactorEnabled,
    },
  };

  const sid = await createSession(sessionData);
  setSessionCookie(res, sid);

  void logAudit(req, "login", {
    userId: dbUser.id,
    userEmail: email,
    userRole: dbUser.role,
    details: "Login efetuado",
  });

  res.json({ user: sessionData.user });
});

const TwoFactorLoginBody = z.object({
  pendingToken: z.string().min(1),
  code: z.string().min(6).max(6),
});

router.post("/login/2fa", loginLimiter, async (req: Request, res: Response) => {
  const parsed = TwoFactorLoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Código inválido." });
    return;
  }

  const pending = await getPendingTwoFactorSession(parsed.data.pendingToken);
  if (!pending) {
    res.status(401).json({ error: "Sessão expirada. Inicie sessão novamente." });
    return;
  }

  const [dbUser] = await db.select().from(usersTable).where(eq(usersTable.id, pending.userId));
  if (!dbUser || !dbUser.twoFactorSecret) {
    res.status(401).json({ error: "Sessão inválida. Inicie sessão novamente." });
    return;
  }

  const validCode = authenticator.check(parsed.data.code, dbUser.twoFactorSecret);
  if (!validCode) {
    res.status(401).json({ error: "Código incorreto. Verifique a app de autenticação." });
    return;
  }

  await deleteSession(parsed.data.pendingToken);

  const sessionData: SessionData = {
    user: {
      id: dbUser.id,
      email: dbUser.email,
      firstName: dbUser.firstName,
      lastName: dbUser.lastName,
      profileImageUrl: dbUser.profileImageUrl,
      role: dbUser.role as "Analista" | "Administrador",
      twoFactorEnabled: dbUser.twoFactorEnabled,
    },
  };

  const sid = await createSession(sessionData);
  setSessionCookie(res, sid);

  void logAudit(req, "login", {
    userId: dbUser.id,
    userEmail: dbUser.email ?? undefined,
    userRole: dbUser.role,
    details: "Login efetuado (com 2FA)",
  });

  res.json({ user: sessionData.user });
});

router.get("/logout", async (req: Request, res: Response) => {
  const sid = getSessionId(req);
  const session = sid ? await getSession(sid) : null;

  await clearSession(res, sid);

  void logAudit(req, "logout", {
    userId: session?.user?.id,
    userEmail: session?.user?.email ?? undefined,
    userRole: session?.user?.role,
    details: "Sessao terminada",
  });

  res.redirect("/");
});

function requireAuth(req: Request, res: Response, next: () => void) {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Não autenticado." });
    return;
  }
  next();
}

// -------------------- Perfil --------------------

const UpdateProfileBody = z.object({
  firstName: z.string().min(1, "O nome é obrigatório."),
  lastName: z.string().min(1, "O apelido é obrigatório."),
  email: z.string().email("Email inválido."),
});

router.patch("/auth/profile", requireAuth, async (req: Request, res: Response) => {
  const parsed = UpdateProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos." });
    return;
  }

  const { firstName, lastName, email } = parsed.data;
  const userId = req.user!.id;

  const [existing] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.email, email.toLowerCase()));

  if (existing && existing.id !== userId) {
    res.status(409).json({ error: "Já existe outra conta com este email." });
    return;
  }

  const [updated] = await db
    .update(usersTable)
    .set({ firstName, lastName, email: email.toLowerCase(), updatedAt: new Date() })
    .where(eq(usersTable.id, userId))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Utilizador não encontrado." });
    return;
  }

  const updatedUser: AuthUser = {
    id: updated.id,
    email: updated.email,
    firstName: updated.firstName,
    lastName: updated.lastName,
    profileImageUrl: updated.profileImageUrl,
    role: updated.role as "Analista" | "Administrador",
    twoFactorEnabled: updated.twoFactorEnabled,
  };

  const sid = getSessionId(req);
  if (sid) await updateSessionUser(sid, updatedUser);

  void logAudit(req, "profile_update", {
    userId,
    userEmail: updated.email ?? undefined,
    userRole: updated.role,
    details: "Perfil atualizado",
  });

  res.json({ user: updatedUser });
});

// -------------------- Mudar palavra-passe --------------------

const ChangePasswordBody = z.object({
  currentPassword: z.string().min(1, "Introduza a palavra-passe atual."),
  newPassword: z.string().min(6, "A nova palavra-passe deve ter pelo menos 6 caracteres."),
});

router.post("/auth/change-password", requireAuth, async (req: Request, res: Response) => {
  const parsed = ChangePasswordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos." });
    return;
  }

  const userId = req.user!.id;
  const [dbUser] = await db.select().from(usersTable).where(eq(usersTable.id, userId));

  if (!dbUser?.password) {
    res.status(404).json({ error: "Utilizador não encontrado." });
    return;
  }

  const matches = await bcrypt.compare(parsed.data.currentPassword, dbUser.password);
  if (!matches) {
    res.status(401).json({ error: "A palavra-passe atual está incorreta." });
    return;
  }

  const newHash = await bcrypt.hash(parsed.data.newPassword, 10);
  await db
    .update(usersTable)
    .set({ password: newHash, updatedAt: new Date() })
    .where(eq(usersTable.id, userId));

  // Por segurança, termina as OUTRAS sessões deste utilizador (ex: se
  // alguém tinha acesso ao dispositivo, perde o acesso ao mudar a senha).
  // A sessão atual (a que fez este pedido) mantém-se.
  const currentSid = getSessionId(req);
  await db
    .delete(sessionsTable)
    .where(
      and(
        sql`${sessionsTable.sess}->'user'->>'id' = ${userId}`,
        currentSid ? ne(sessionsTable.sid, currentSid) : sql`true`,
      ),
    );

  void logAudit(req, "password_change", {
    userId,
    userEmail: dbUser.email ?? undefined,
    userRole: dbUser.role,
    details: "Palavra-passe alterada",
  });

  res.json({ success: true });
});

// -------------------- Autenticação de dois fatores (2FA) --------------------

router.post("/auth/2fa/setup", requireAuth, async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const [dbUser] = await db.select().from(usersTable).where(eq(usersTable.id, userId));

  if (!dbUser) {
    res.status(404).json({ error: "Utilizador não encontrado." });
    return;
  }

  // Gera um novo segredo — fica guardado mas NÃO ativado até o utilizador
  // confirmar que consegue gerar um código válido com ele.
  const secret = authenticator.generateSecret();
  await db
    .update(usersTable)
    .set({ twoFactorSecret: secret, twoFactorEnabled: false, updatedAt: new Date() })
    .where(eq(usersTable.id, userId));

  const otpauthUrl = authenticator.keyuri(dbUser.email ?? userId, "ELEVEN Technology", secret);
  const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

  res.json({ secret, qrCodeDataUrl });
});

const TwoFactorVerifyBody = z.object({ code: z.string().min(6).max(6) });

router.post("/auth/2fa/verify", requireAuth, async (req: Request, res: Response) => {
  const parsed = TwoFactorVerifyBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Código inválido." });
    return;
  }

  const userId = req.user!.id;
  const [dbUser] = await db.select().from(usersTable).where(eq(usersTable.id, userId));

  if (!dbUser?.twoFactorSecret) {
    res.status(400).json({ error: "Nenhuma configuração de 2FA pendente. Comece o processo novamente." });
    return;
  }

  const validCode = authenticator.check(parsed.data.code, dbUser.twoFactorSecret);
  if (!validCode) {
    res.status(401).json({ error: "Código incorreto. Verifique a app de autenticação e tente novamente." });
    return;
  }

  await db
    .update(usersTable)
    .set({ twoFactorEnabled: true, updatedAt: new Date() })
    .where(eq(usersTable.id, userId));

  const updatedUser: AuthUser = { ...req.user!, twoFactorEnabled: true };
  const sid = getSessionId(req);
  if (sid) await updateSessionUser(sid, updatedUser);

  void logAudit(req, "2fa_enable", {
    userId,
    userEmail: dbUser.email ?? undefined,
    userRole: dbUser.role,
    details: "Autenticação de dois fatores ativada",
  });

  res.json({ success: true });
});

const DisableTwoFactorBody = z.object({ password: z.string().min(1) });

router.post("/auth/2fa/disable", requireAuth, async (req: Request, res: Response) => {
  const parsed = DisableTwoFactorBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Introduza a sua palavra-passe para desativar o 2FA." });
    return;
  }

  const userId = req.user!.id;
  const [dbUser] = await db.select().from(usersTable).where(eq(usersTable.id, userId));

  if (!dbUser?.password) {
    res.status(404).json({ error: "Utilizador não encontrado." });
    return;
  }

  const matches = await bcrypt.compare(parsed.data.password, dbUser.password);
  if (!matches) {
    res.status(401).json({ error: "Palavra-passe incorreta." });
    return;
  }

  await db
    .update(usersTable)
    .set({ twoFactorEnabled: false, twoFactorSecret: null, updatedAt: new Date() })
    .where(eq(usersTable.id, userId));

  const updatedUser: AuthUser = { ...req.user!, twoFactorEnabled: false };
  const sid = getSessionId(req);
  if (sid) await updateSessionUser(sid, updatedUser);

  void logAudit(req, "2fa_disable", {
    userId,
    userEmail: dbUser.email ?? undefined,
    userRole: dbUser.role,
    details: "Autenticação de dois fatores desativada",
  });

  res.json({ success: true });
});

export default router;