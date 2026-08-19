import crypto from "crypto";
import { type Request, type Response } from "express";
import { db, sessionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export interface AuthUser {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  role?: "Analista" | "Administrador";
  twoFactorEnabled?: boolean;
}

export const SESSION_COOKIE = "sid";
export const SESSION_TTL = 7 * 24 * 60 * 60 * 1000;
// Sessão temporária criada depois do email/palavra-passe estarem certos,
// mas antes do código de 2FA ser confirmado. Curta duração de propósito.
export const PENDING_2FA_TTL = 5 * 60 * 1000;
export const IS_PRODUCTION = process.env.NODE_ENV === "production";

export interface SessionData {
  user: AuthUser;
}

// Sessão "pendente" de 2FA: sabemos quem é o utilizador, mas ainda não
// confirmámos o código de autenticação. Nunca tem "user" definido, por
// isso o authMiddleware nunca a trata como autenticada, mesmo que o token
// pendente seja enviado por engano como cookie de sessão.
export interface PendingTwoFactorSession {
  pending2FA: true;
  userId: string;
}

export async function createSession(data: SessionData, ttlMs: number = SESSION_TTL): Promise<string> {
  const sid = crypto.randomBytes(32).toString("hex");
  await db.insert(sessionsTable).values({
    sid,
    sess: data as unknown as Record<string, unknown>,
    expire: new Date(Date.now() + ttlMs),
  });
  return sid;
}

export async function createPendingTwoFactorSession(userId: string): Promise<string> {
  const sid = crypto.randomBytes(32).toString("hex");
  const payload: PendingTwoFactorSession = { pending2FA: true, userId };
  await db.insert(sessionsTable).values({
    sid,
    sess: payload as unknown as Record<string, unknown>,
    expire: new Date(Date.now() + PENDING_2FA_TTL),
  });
  return sid;
}

export async function getPendingTwoFactorSession(sid: string): Promise<PendingTwoFactorSession | null> {
  const [row] = await db
    .select()
    .from(sessionsTable)
    .where(eq(sessionsTable.sid, sid));

  if (!row || row.expire < new Date()) {
    if (row) await deleteSession(sid);
    return null;
  }

  const sess = row.sess as unknown as Partial<PendingTwoFactorSession>;
  if (sess.pending2FA !== true || !sess.userId) return null;
  return sess as PendingTwoFactorSession;
}

export async function getSession(sid: string): Promise<SessionData | null> {
  const [row] = await db
    .select()
    .from(sessionsTable)
    .where(eq(sessionsTable.sid, sid));

  if (!row || row.expire < new Date()) {
    if (row) await deleteSession(sid);
    return null;
  }

  return row.sess as SessionData;
}

export async function deleteSession(sid: string): Promise<void> {
  await db.delete(sessionsTable).where(eq(sessionsTable.sid, sid));
}

// Quando o perfil ou as definições de segurança do utilizador mudam
// (nome, email, 2FA), a sessão ativa guarda uma cópia desses dados — sem
// isto, a mudança só apareceria depois de um novo login. Atualiza essa
// cópia para as mudanças refletirem-se de imediato.
export async function updateSessionUser(sid: string, user: AuthUser): Promise<void> {
  await db
    .update(sessionsTable)
    .set({ sess: { user } as unknown as Record<string, unknown> })
    .where(eq(sessionsTable.sid, sid));
}

export async function clearSession(res: Response, sid?: string): Promise<void> {
  if (sid) await deleteSession(sid);
  res.clearCookie(SESSION_COOKIE, { path: "/" });
}

export function getSessionId(req: Request): string | undefined {
  const authHeader = req.headers["authorization"];
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  return req.cookies?.[SESSION_COOKIE] as string | undefined;
}
