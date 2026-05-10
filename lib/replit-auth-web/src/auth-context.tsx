import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

export interface AuthUser {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  role?: "Analista" | "Administrador";
}

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  logout: () => void;
  loginWithCredentials: (email: string, password: string) => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/user", { credentials: "include" })
      .then((r) => (r.ok ? (r.json() as Promise<{ user: AuthUser | null }>) : Promise.resolve({ user: null })))
      .then((d) => setUser(d.user ?? null))
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false));
  }, []);

  const logout = useCallback(() => {
    window.location.href = "/api/logout";
  }, []);

  const loginWithCredentials = useCallback(async (email: string, password: string) => {
    const res = await fetch("/api/demo-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });
    const data = (await res.json()) as { user?: AuthUser; error?: string };
    if (!res.ok) throw new Error(data.error ?? "Erro ao autenticar.");
    setUser(data.user ?? null);
  }, []);

  const value: AuthState = {
    user,
    isLoading,
    isAuthenticated: !!user,
    isAdmin: user?.role === "Administrador",
    logout,
    loginWithCredentials,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
