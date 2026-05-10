import { Link, useLocation } from "wouter";
import { LayoutDashboard, TrendingUp, AlertTriangle, Plug, LogOut, Shield, Lock, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@workspace/replit-auth-web";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, adminOnly: false },
  { href: "/predicoes", label: "Análise Preditiva", icon: TrendingUp, adminOnly: false },
  { href: "/anomalias", label: "Deteção de Anomalias", icon: AlertTriangle, adminOnly: false },
  { href: "/integracoes", label: "Integrações", icon: Plug, adminOnly: true },
  { href: "/admin", label: "Gestão de Utilizadores", icon: Users, adminOnly: true },
];

const ROLE_STYLES: Record<string, { label: string; classes: string }> = {
  Administrador: {
    label: "Admin",
    classes: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30",
  },
  Analista: {
    label: "Analista",
    classes: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  },
};

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, logout, isAdmin } = useAuth();

  const initials = user
    ? `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase() || "U"
    : "AD";

  const displayName = user
    ? [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "Utilizador"
    : "Admin User";

  const roleStyle = user?.role ? ROLE_STYLES[user.role] : null;

  const visibleNavItems = navItems.filter((item) => !item.adminOnly || isAdmin);
  const lockedNavItems = navItems.filter((item) => item.adminOnly && !isAdmin);

  return (
    <div className="flex min-h-screen bg-background text-foreground dark">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card flex flex-col hidden md:flex">
        <div className="p-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-primary font-bold text-primary-foreground text-sm">
              11
            </div>
            <div>
              <div className="font-bold tracking-tight text-foreground">ELEVEN</div>
              <div className="text-xs text-muted-foreground uppercase tracking-widest">Technology</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1">
          {visibleNavItems.map((item) => {
            const isActive = location === item.href;
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${
                    isActive
                      ? "bg-primary/10 text-primary shadow-[0_0_15px_rgba(56,189,248,0.1)]"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="font-medium text-sm">{item.label}</span>
                  {item.adminOnly && (
                    <span className="ml-auto">
                      <Shield className="h-3 w-3 text-indigo-400 opacity-60" />
                    </span>
                  )}
                </div>
              </Link>
            );
          })}

          {lockedNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.href}
                title="Acesso restrito a Administradores"
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl opacity-30 cursor-not-allowed select-none"
              >
                <Icon className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium text-sm text-muted-foreground">{item.label}</span>
                <span className="ml-auto">
                  <Lock className="h-3 w-3 text-muted-foreground" />
                </span>
              </div>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border space-y-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9 border border-border">
              {user?.profileImageUrl && <AvatarImage src={user.profileImageUrl} alt={displayName} />}
              <AvatarFallback className="bg-muted text-muted-foreground text-xs font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-sm font-medium truncate">{displayName}</span>
              {user?.email && (
                <span className="text-xs text-muted-foreground truncate">{user.email}</span>
              )}
            </div>
          </div>

          {roleStyle && (
            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-xs font-semibold w-fit ${roleStyle.classes}`}>
              {user?.role === "Administrador" ? (
                <Shield className="h-3 w-3" />
              ) : (
                <div className="h-1.5 w-1.5 rounded-full bg-current" />
              )}
              {roleStyle.label}
            </div>
          )}

          <button
            onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Terminar Sessão
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <div className="flex-1 overflow-auto p-6 md:p-8">
          <div className="max-w-7xl mx-auto space-y-8">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
