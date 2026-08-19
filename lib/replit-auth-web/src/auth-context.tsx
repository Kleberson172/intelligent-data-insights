import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

export interface AuthUser {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  role?: "Analista" | "Administrador";
  twoFactorEnabled?: boolean;
}

export type LoginResult =
  | { requires2FA: true; pendingToken: string }
  | { requires2FA: false };

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  logout: () => void;
  loginWithCredentials: (email: string, password: string) => Promise<LoginResult>;
  verifyTwoFactor: (pendingToken: string, code: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const r = await fetch("/api/auth/user", { credentials: "include" });
      const d = (r.ok ? await r.json() : { user: null }) as { user: AuthUser | null };
      setUser(d.user ?? null);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    refreshUser().finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logout = useCallback(() => {
    window.location.href = "/api/logout";
  }, []);

  const loginWithCredentials = useCallback(async (email: string, password: string): Promise<LoginResult> => {
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });
    const data = (await res.json()) as { user?: AuthUser; error?: string; requires2FA?: boolean; pendingToken?: string };
    if (!res.ok) throw new Error(data.error ?? "Erro ao autenticar.");

    if (data.requires2FA && data.pendingToken) {
      return { requires2FA: true, pendingToken: data.pendingToken };
    }

    setUser(data.user ?? null);
    return { requires2FA: false };
  }, []);

  const verifyTwoFactor = useCallback(async (pendingToken: string, code: string) => {
    const res = await fetch("/api/login/2fa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ pendingToken, code }),
    });
    const data = (await res.json()) as { user?: AuthUser; error?: string };
    if (!res.ok) throw new Error(data.error ?? "Código inválido.");
    setUser(data.user ?? null);
  }, []);

  const value: AuthState = {
    user,
    isLoading,
    isAuthenticated: !!user,
    isAdmin: user?.role === "Administrador",
    logout,
    loginWithCredentials,
    verifyTwoFactor,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}