import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, Package, ShoppingCart, Users, BarChart2,
  Megaphone, Settings, LogOut, Bell, Search, ShieldCheck, UserCog
} from "lucide-react";
import { useAuth } from "@workspace/replit-auth-web";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getRoleConfig } from "@/lib/permissions";

const ALL_NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, roles: ["Administrador", "Analista"] },
  { href: "/products", label: "Produtos", icon: Package, roles: ["Administrador"] },
  { href: "/orders", label: "Encomendas", icon: ShoppingCart, roles: ["Administrador"] },
  { href: "/customers", label: "Clientes", icon: Users, roles: ["Administrador", "Analista"] },
  { href: "/analytics", label: "Análise", icon: BarChart2, roles: ["Administrador", "Analista"] },
  { href: "/marketing", label: "Marketing", icon: Megaphone, roles: ["Administrador"] },
  { href: "/settings", label: "Definições", icon: Settings, roles: ["Administrador"] },
  { href: "/admin", label: "Utilizadores", icon: ShieldCheck, roles: ["Administrador"] },
];

export function AppLayout({ children, title = "Dashboard", showSearch = true }: {
  children: React.ReactNode;
  title?: string;
  showSearch?: boolean;
}) {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  const role = user?.role ?? "Analista";
  const roleConfig = getRoleConfig(role);

  const navItems = ALL_NAV_ITEMS.filter(item =>
    item.roles.includes(role)
  );

  const initials = user
    ? `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase() || "U"
    : "AD";

  const displayName = user
    ? [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "Admin"
    : "Admin";

  return (
    <div className="flex min-h-screen app-bg dark">
      {/* Sidebar */}
      <aside className="w-[185px] flex-shrink-0 fixed left-0 top-0 h-screen glass-sidebar flex flex-col z-50">
        {/* Logo */}
        <div className="px-5 pt-7 pb-5">
          <div className="flex items-center gap-2.5">
            <img src="/logo-eleven.png" alt="ELEVEN" className="w-9 h-9 object-contain drop-shadow-[0_0_8px_rgba(56,189,248,0.6)]" />
            <div>
              <div className="font-bold text-white text-sm leading-none tracking-wide">ELEVEN</div>
              <div className="text-[9px] text-cyan-400 tracking-[0.25em] uppercase mt-0.5">Technology</div>
            </div>
          </div>
        </div>

        {/* Role badge */}
        <div className="px-4 mb-4">
          <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[10px] font-semibold tracking-wide w-full ${roleConfig.badgeClass}`}>
            {role === "Administrador"
              ? <ShieldCheck size={11} className="flex-shrink-0" />
              : <UserCog size={11} className="flex-shrink-0" />
            }
            {roleConfig.label}
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.href === "/"
              ? location === "/"
              : location.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-200 ${
                    isActive
                      ? "nav-active text-cyan-300"
                      : "text-gray-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <Icon className="flex-shrink-0" size={16} />
                  <span className="text-sm font-medium">{item.label}</span>
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Divider */}
        <div className="mx-4 border-t border-white/8 my-3" />

        {/* Profile */}
        <div className="px-4 pb-4 space-y-1">
          <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl">
            <Avatar className="h-7 w-7 flex-shrink-0">
              {user?.profileImageUrl && <AvatarImage src={user.profileImageUrl} />}
              <AvatarFallback className={`text-white text-xs font-bold ${role === "Administrador" ? "bg-indigo-600" : "bg-cyan-700"}`}>
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-white truncate">{displayName}</div>
              <div className="text-[10px] text-gray-500 truncate">{user?.email ?? ""}</div>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-gray-500 hover:text-red-400 hover:bg-red-500/5 transition-all w-full text-sm"
          >
            <LogOut size={14} />
            <span className="text-sm">Sair</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 ml-[185px] flex flex-col min-h-screen">
        {/* Header */}
        <header className="sticky top-0 z-40 h-14 flex items-center px-6 gap-4 border-b border-white/5 bg-[#080b14]/80 backdrop-blur-xl">
          <h1 className="text-white font-semibold text-base flex-shrink-0">{title}</h1>
          <div className="flex-1" />
          {showSearch && (
            <div className="flex items-center gap-2 bg-white/5 border border-white/8 rounded-xl px-3 py-1.5 w-48">
              <Search size={13} className="text-gray-500 flex-shrink-0" />
              <input
                type="text"
                placeholder="Pesquisar…"
                className="bg-transparent text-xs text-gray-300 placeholder-gray-600 outline-none w-full"
              />
            </div>
          )}
          <button className="w-8 h-8 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center text-gray-400 hover:text-white transition-colors relative">
            <Bell size={14} />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-cyan-400 rounded-full" />
          </button>
          <div className="flex items-center gap-2 bg-white/5 border border-white/8 rounded-xl px-2.5 py-1.5 cursor-pointer hover:bg-white/10 transition-colors">
            <Avatar className="h-6 w-6">
              {user?.profileImageUrl && <AvatarImage src={user.profileImageUrl} />}
              <AvatarFallback className={`text-white text-xs font-bold ${role === "Administrador" ? "bg-indigo-600" : "bg-cyan-700"}`}>
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-gray-300 font-medium hidden sm:block">{displayName}</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-5 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}