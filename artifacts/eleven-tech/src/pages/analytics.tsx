import { AppLayout } from "@/components/layout";
import { motion } from "framer-motion";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";

const acquisitionData: { day: string; users: number; retained: number }[] = [
  { day: "Mon", users: 0, retained: 0 },
  { day: "Tue", users: 0, retained: 0 },
  { day: "Wed", users: 0, retained: 0 },
  { day: "Thu", users: 0, retained: 0 },
  { day: "Fri", users: 0, retained: 0 },
  { day: "Sat", users: 0, retained: 0 },
  { day: "Sun", users: 0, retained: 0 },
];

const trafficData: { name: string; value: number; color: string }[] = [];

const funnelData: { label: string; width: string; color: string }[] = [
  { label: "Visits", width: "0%", color: "from-cyan-400 to-cyan-600" },
  { label: "Add to Cart", width: "0%", color: "from-indigo-400 to-indigo-600" },
  { label: "Checkout", width: "0%", color: "from-purple-400 to-purple-600" },
  { label: "Purchase", width: "0%", color: "from-pink-400 to-pink-600" },
];

export default function Analytics() {
  return (
    <AppLayout title="Analytics">
      <div className="space-y-4">
        {/* Top Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Acquisition chart — 2 cols */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-2 glass-card rounded-2xl p-5"
          >
            <div className="mb-4">
              <h3 className="text-white font-semibold">User Acquisition & Retention (Last 30 Days)</h3>
            </div>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={acquisitionData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="day" stroke="rgba(255,255,255,0.3)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="rgba(255,255,255,0.3)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `${v/1000}k`} />
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: 'rgba(15,18,35,0.95)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px' }}
                  />
                  <Line type="monotone" dataKey="users" stroke="#38bdf8" strokeWidth={2.5} dot={{ fill: "#38bdf8", r: 4, strokeWidth: 0 }} name="Acquisition" />
                  <Line type="monotone" dataKey="retained" stroke="#f472b6" strokeWidth={2.5} dot={{ fill: "#f472b6", r: 4, strokeWidth: 0 }} name="Retention" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Traffic Sources pie */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06 }}
            className="glass-card rounded-2xl p-5"
          >
            <h3 className="text-white font-semibold mb-3">Traffic Sources</h3>
            <div className="h-[150px]">
              {trafficData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-gray-500">
                  Sem dados de tráfego ainda
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={trafficData} cx="50%" cy="50%" innerRadius={40} outerRadius={68} paddingAngle={3} dataKey="value">
                      {trafficData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} opacity={0.9} />
                      ))}
                    </Pie>
                    <RechartsTooltip contentStyle={{ backgroundColor: 'rgba(15,18,35,0.95)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="space-y-1.5 mt-2">
              {trafficData.map(item => (
                <div key={item.name} className="flex items-center gap-2 text-xs">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: item.color }} />
                  <span className="text-gray-400 flex-1">{item.name}</span>
                  <span className="text-white font-medium">{item.value}%</span>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-white/5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Bounce Rate</span>
                <span className="text-sm font-bold text-white">0%</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Traffic Sources (bottom) */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="glass-card rounded-2xl p-5"
          >
            <h3 className="text-white font-semibold mb-3">Traffic Sources</h3>
            <div className="h-[150px]">
              {trafficData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-gray-500">
                  Sem dados de tráfego ainda
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={trafficData} cx="50%" cy="50%" outerRadius={68} paddingAngle={3} dataKey="value">
                      {trafficData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} opacity={0.9} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="space-y-1.5 mt-2">
              {trafficData.map(item => (
                <div key={item.name} className="flex items-center gap-2 text-xs">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: item.color }} />
                  <span className="text-gray-400">{item.name}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Sales Conversion Funnel */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 }}
            className="glass-card rounded-2xl p-5"
          >
            <h3 className="text-white font-semibold mb-4">Sales Conversion Funnel</h3>
            <div className="flex flex-col items-center gap-2 mt-2">
              {funnelData.map((step, i) => (
                <div key={step.label} className="w-full flex flex-col items-center">
                  <div
                    className={`h-10 rounded-lg bg-gradient-to-r ${step.color} flex items-center justify-center border border-white/10`}
                    style={{ width: step.width === "0%" ? "100%" : step.width, maxWidth: "100%", opacity: step.width === "0%" ? 0.15 : 1 }}
                  />
                  <div className="text-xs text-gray-400 mt-1">{step.label}</div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Metrics */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.24 }}
            className="space-y-3"
          >
            <div className="glass-card rounded-2xl p-5">
              <div className="text-xs text-gray-400 mb-1">Avg. Session Duration</div>
              <div className="text-3xl font-bold text-white">0m 0s</div>
            </div>
            <div className="glass-card rounded-2xl p-5">
              <div className="text-xs text-gray-400 mb-1">Goal Completions</div>
              <div className="text-3xl font-bold text-white">0</div>
            </div>
          </motion.div>
        </div>
      </div>
    </AppLayout>
  );
}
