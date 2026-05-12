import { useState, useRef, useEffect } from "react";
import { ArrowUpRight, DollarSign, ShoppingBag, Users, AlertTriangle, TrendingUp } from "lucide-react";
import { AppLayout } from "@/components/layout";
import { AIChatZone } from "@/components/ai-chat";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, LineChart, Line
} from "recharts";
import { motion } from "framer-motion";

const salesData = [
  { day: "Mon", value: 8000, label: "Mon:\n$8k" },
  { day: "Tue", value: 7000, label: "Tue:\n$7k" },
  { day: "Wed", value: 5000, label: "Wed:\n$5k" },
  { day: "Thu", value: 8000, label: "Thu:\n$8k" },
  { day: "Fri", value: 9000, label: "Fri:\n$9k" },
  { day: "Sat", value: 12000, label: "Sat:\n$12k" },
  { day: "Sun", value: 10000, label: "Sun:\n$10k" },
];

const recentOrders = [
  { id: "ORD-001", customer: "Alice D.", status: "Pending", total: "$120" },
  { id: "ORD-002", customer: "Bob S.", status: "Shipped", total: "$85" },
  { id: "ORD-003", customer: "Charlie K.", status: "Delivered", total: "$210" },
  { id: "ORD-004", customer: "David L.", status: "Processing", total: "$150" },
];

const topProducts = [
  { name: "Smart Watch X", sold: "1,200 Sold", img: "⌚" },
  { name: "Wireless Earbuds", sold: "950 Sold", img: "🎧" },
  { name: "Portable Charger", sold: "800 Sold", img: "🔋" },
  { name: "Gaming Mouse", sold: "650 Sold", img: "🖱️" },
];

const STATUS_COLORS: Record<string, string> = {
  Pending: "text-yellow-400 bg-yellow-400/10 border-yellow-400/30",
  Shipped: "text-blue-400 bg-blue-400/10 border-blue-400/30",
  Delivered: "text-green-400 bg-green-400/10 border-green-400/30",
  Processing: "text-purple-400 bg-purple-400/10 border-purple-400/30",
};

function useCountUp(target: number, duration = 1200) {
  const [count, setCount] = useState(0);
  const frameRef = useRef<number>(0);
  useEffect(() => {
    if (!target) return;
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(target * eased));
      if (progress < 1) frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, duration]);
  return count;
}

function StatCard({ icon: Icon, label, value, change, color, delay = 0 }: {
  icon: React.ElementType; label: string; value: string; change: string; color: string; delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="glass-card rounded-2xl p-5"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-gray-400 text-sm">{label}</span>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
          <Icon size={16} />
        </div>
      </div>
      <div className="text-2xl font-bold text-white mb-1">{value}</div>
      <div className="flex items-center gap-1 text-xs text-emerald-400">
        <ArrowUpRight size={12} />
        <span>{change} from last month</span>
      </div>
    </motion.div>
  );
}

export default function Dashboard() {
  const revenue = useCountUp(45290);

  return (
    <AppLayout title="Dashboard">
      <div className="space-y-5">
        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={DollarSign} label="Total Revenue" value={`$${revenue.toLocaleString()}`} change="+15%" color="bg-cyan-500/15 text-cyan-400" delay={0} />
          <StatCard icon={ShoppingBag} label="Total Orders" value="1,247" change="+8%" color="bg-indigo-500/15 text-indigo-400" delay={0.06} />
          <StatCard icon={Users} label="Active Users" value="1,450" change="+12%" color="bg-purple-500/15 text-purple-400" delay={0.12} />
          <StatCard icon={AlertTriangle} label="Pending Issues" value="24" change="-3%" color="bg-amber-500/15 text-amber-400" delay={0.18} />
        </div>

        {/* AI Assistant */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22, duration: 0.4 }}>
          <AIChatZone />
        </motion.div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Sales Overview */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28, duration: 0.4 }}
            className="lg:col-span-2 glass-card rounded-2xl p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-white font-semibold">Sales Overview</h3>
                <p className="text-gray-400 text-xs mt-0.5">Weekly Sales</p>
              </div>
              <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                Live
              </span>
            </div>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={salesData} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#818cf8" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="#818cf8" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="day" stroke="rgba(255,255,255,0.3)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="rgba(255,255,255,0.3)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `$${v/1000}k`} />
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: 'rgba(15,18,35,0.95)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px' }}
                    formatter={(v: number) => [`$${v.toLocaleString()}`, "Sales"]}
                  />
                  <Area type="monotone" dataKey="value" stroke="#818cf8" strokeWidth={2.5} fill="url(#gSales)" dot={{ fill: "#818cf8", r: 4, strokeWidth: 0 }} activeDot={{ r: 5, fill: "#818cf8" }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Recent Orders */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.34, duration: 0.4 }}
            className="glass-card rounded-2xl p-5"
          >
            <h3 className="text-white font-semibold mb-4">Recent Orders</h3>
            <div className="space-y-0">
              <div className="grid grid-cols-4 text-xs text-gray-500 pb-2 border-b border-white/5 mb-2">
                <span>Order ID</span>
                <span>Customer</span>
                <span>Status</span>
                <span className="text-right">Total</span>
              </div>
              {recentOrders.map((order) => (
                <div key={order.id} className="grid grid-cols-4 text-xs py-2.5 border-b border-white/5 last:border-0 items-center">
                  <span className="text-gray-300 font-mono">{order.id}</span>
                  <span className="text-gray-300">{order.customer}</span>
                  <span>
                    <span className={`px-1.5 py-0.5 rounded-full border text-[10px] font-medium ${STATUS_COLORS[order.status]}`}>
                      {order.status}
                    </span>
                  </span>
                  <span className="text-white font-medium text-right">{order.total}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Top Products */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.4 }}
            className="glass-card rounded-2xl p-5"
          >
            <h3 className="text-white font-semibold mb-4">Top Products</h3>
            <div className="space-y-3">
              {topProducts.map((p) => (
                <div key={p.name} className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-xl flex-shrink-0">
                    {p.img}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white font-medium truncate">{p.name}</div>
                    <div className="text-xs text-gray-400">{p.sold}</div>
                  </div>
                  <TrendingUp size={14} className="text-emerald-400 flex-shrink-0" />
                </div>
              ))}
            </div>
          </motion.div>

          {/* Active Users */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.46, duration: 0.4 }}
            className="glass-card rounded-2xl p-5 flex flex-col justify-between"
          >
            <div>
              <h3 className="text-white font-semibold mb-1">Active Users</h3>
              <div className="text-5xl font-bold text-cyan-400 mt-3 mb-2">1,450</div>
              <div className="text-xs text-gray-400">Users currently on platform</div>
            </div>
            <div className="h-[80px] mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={salesData}>
                  <Line type="monotone" dataKey="value" stroke="#38bdf8" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Pending Issues */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.52, duration: 0.4 }}
            className="glass-card rounded-2xl p-5 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-white font-semibold">Pending Issues</h3>
                <AlertTriangle size={16} className="text-amber-400" />
              </div>
              <div className="text-5xl font-bold text-amber-400 mt-3 mb-2">24</div>
              <div className="text-xs text-gray-400">Require attention</div>
            </div>
            <div className="space-y-2 mt-4">
              {[
                { label: "Critical", value: 3, color: "bg-red-500" },
                { label: "High", value: 8, color: "bg-amber-500" },
                { label: "Medium", value: 13, color: "bg-yellow-500" },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-2 text-xs">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${item.color}`} />
                  <span className="text-gray-400 flex-1">{item.label}</span>
                  <span className="text-white font-medium">{item.value}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </AppLayout>
  );
}
