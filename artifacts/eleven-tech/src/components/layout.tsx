import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, Package, ShoppingCart, Users, BarChart2,
  Megaphone, Settings, LogOut, Bell, Search, User
} from "lucide-react";
import { useAuth } from "@workspace/replit-auth-web";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/products", label: "Products", icon: Package },
  { href: "/orders", label: "Orders", icon: ShoppingCart },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/analytics", label: "Analytics", icon: BarChart2 },
  { href: "/marketing", label: "Marketing", icon: Megaphone },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppLayout({ children, title = "Dashboard", showSearch = true }: {
  children: React.ReactNode;
  title?: string;
  showSearch?: boolean;
}) {
  const [location] = useLocation();
  const { user, logout } = useAuth();

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
        <div className="px-5 pt-7 pb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-indigo-500 flex items-center justify-center font-black text-white text-sm shadow-[0_0_15px_rgba(56,189,248,0.5)]">
              11
            </div>
            <div>
              <div className="font-bold text-white text-sm leading-none tracking-wide">ELEVEN</div>
              <div className="text-[9px] text-cyan-400 tracking-[0.25em] uppercase mt-0.5">Technology</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 space-y-0.5">
          {navItems.map((item) => {
            const isActive = item.href === "/"
              ? location === "/"
              : location.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-xl cursor-pointer transition-all duration-200 ${
                    isActive
                      ? "nav-active text-cyan-300"
                      : "text-gray-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <Icon className="flex-shrink-0" size={18} />
                  <span className="text-sm font-medium">{item.label}</span>
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="px-3 pb-6 space-y-1 border-t border-white/5 pt-4 mt-2">
          <Link href="/settings">
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl cursor-pointer text-gray-400 hover:text-white hover:bg-white/5 transition-all">
              <User size={18} />
              <span className="text-sm font-medium">Admin Profile</span>
            </div>
          </Link>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-all"
          >
            <LogOut size={18} />
            <span className="text-sm font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="ml-[185px] flex-1 flex flex-col min-h-screen">
        {/* Top Bar */}
        <header className="flex items-center justify-between px-8 pt-6 pb-2">
          <h1 className="text-2xl font-bold text-white">{title}</h1>
          <div className="flex items-center gap-3">
            {showSearch && (
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-2 w-52">
                <Search size={15} className="text-gray-400 flex-shrink-0" />
                <input
                  type="text"
                  placeholder="Search"
                  className="bg-transparent text-sm text-white placeholder-gray-500 outline-none w-full"
                />
              </div>
            )}
            <button className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors relative">
              <Bell size={16} />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-cyan-400 rounded-full" />
            </button>
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-2.5 py-1.5 cursor-pointer hover:bg-white/10 transition-colors">
              <Avatar className="h-6 w-6">
                {user?.profileImageUrl && <AvatarImage src={user.profileImageUrl} />}
                <AvatarFallback className="bg-indigo-600 text-white text-xs font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm text-white font-medium pr-1">{displayName.split(" ")[0]}</span>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 px-8 py-4 pb-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
