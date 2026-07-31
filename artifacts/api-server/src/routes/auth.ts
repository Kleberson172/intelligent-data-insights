import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  clearSession,
  getSessionId,
  getSession,
  createSession,
  SESSION_COOKIE,
  SESSION_TTL,
  IS_PRODUCTION,
  type SessionData,
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

  const sessionData: SessionData = {
    user: {
      id: dbUser.id,
      email: dbUser.email,
      firstName: dbUser.firstName,
      lastName: dbUser.lastName,
      profileImageUrl: dbUser.profileImageUrl,
      role: dbUser.role as "Analista" | "Administrador",
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

export default router;