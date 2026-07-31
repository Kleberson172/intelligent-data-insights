import { AppLayout } from "@/components/layout";
import { motion } from "framer-motion";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar
} from "recharts";

const campaignData = [
  { day: "Mon", email: 6000, social: 7000, ppc: 5000 },
  { day: "Tue", email: 8000, social: 9000, ppc: 7000 },
  { day: "Wed", email: 12000, social: 11000, ppc: 6000 },
  { day: "Thu", email: 20000, social: 15000, ppc: 8000 },
  { day: "Fri", email: 18000, social: 20000, ppc: 12000 },
  { day: "Sat", email: 15000, social: 17000, ppc: 10000 },
];

const audienceData = [
  { name: "Social Media", value: 45, color: "#818cf8" },
  { name: "Search", value: 30, color: "#c084fc" },
  { name: "Direct", value: 15, color: "#94a3b8" },
  { name: "Referral", value: 10, color: "#64748b" },
];

const adSpendData = [
  { channel: "Ad", spend: 39000 },
  { channel: "Soc", spend: 16000 },
  { channel: "Two", spend: 12000 },
  { channel: "Bun", spend: 20000 },
  { channel: "PPC", spend: 35000 },
];

const topCampaigns = [
  { name: "Campaign Name", rate: "10.0%" },
  { name: "Campaign 2", rate: "7.5%" },
  { name: "Campaign 3", rate: "5.0%" },
];

export default function Marketing() {
  return (
    <AppLayout title="Marketing">
      <div className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Campaign Performance — 2 cols */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-2 glass-card rounded-2xl p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-white font-semibold">Campaign Performance</h3>
                <div className="flex items-center gap-4 mt-2">
                  {[
                    { label: "Email", color: "#38bdf8" },
                    { label: "Social", color: "#818cf8" },
                    { label: "PPC", color: "#f472b6" },
                  ].map(item => (
                    <div key={item.label} className="flex items-center gap-1.5 text-xs text-gray-400">
                      <span className="w-2.5 h-1 rounded-full" style={{ background: item.color }} />
                      {item.label}
                    </div>
                  ))}
                </div>
              </div>
              <span className="text-xs text-gray-400 bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg">Past week</span>
            </div>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={campaignData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="day" stroke="rgba(255,255,255,0.3)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="rgba(255,255,255,0.3)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `$${v/1000}k`} />
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: 'rgba(15,18,35,0.95)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px' }}
                    formatter={(v: number, name: string) => [`$${v.toLocaleString()}`, name]}
                  />
                  <Line type="monotone" dataKey="email" stroke="#38bdf8" strokeWidth={2.5} dot={{ fill: "#38bdf8", r: 3, strokeWidth: 0 }} name="Email" />
                  <Line type="monotone" dataKey="social" stroke="#818cf8" strokeWidth={2.5} dot={{ fill: "#818cf8", r: 3, strokeWidth: 0 }} name="Social" />
                  <Line type="monotone" dataKey="ppc" stroke="#f472b6" strokeWidth={2.5} dot={{ fill: "#f472b6", r: 3, strokeWidth: 0 }} name="PPC" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Audience Reach */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06 }}
            className="glass-card rounded-2xl p-5"
          >
            <h3 className="text-white font-semibold mb-3">Audience Reach</h3>
            <div className="relative h-[160px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={audienceData} cx="50%" cy="50%" outerRadius={72} paddingAngle={2} dataKey="value" startAngle={90} endAngle={-270}>
                    {audienceData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} opacity={0.9} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              {/* Percentage labels */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="grid grid-cols-2 gap-x-16 gap-y-1 absolute inset-0 flex items-center justify-center">
                  <span className="absolute top-[15%] right-[10%] text-xs text-white font-semibold">10%</span>
                  <span className="absolute top-[40%] right-[5%] text-xs text-white font-semibold">15%</span>
                  <span className="absolute bottom-[20%] left-[25%] text-xs text-white font-semibold">45%</span>
                  <span className="absolute top-[35%] left-[5%] text-xs text-white font-semibold">30%</span>
                </div>
              </div>
            </div>
            <div className="space-y-1.5 mt-2">
              {audienceData.map(item => (
                <div key={item.name} className="flex items-center gap-2 text-xs">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: item.color }} />
                  <span className="text-gray-400">{item.name}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Ad Spend */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="glass-card rounded-2xl p-5"
          >
            <h3 className="text-white font-semibold mb-4">Ad Spend</h3>
            <div className="h-[160px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={adSpendData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="channel" stroke="rgba(255,255,255,0.3)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="rgba(255,255,255,0.3)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `$${v/1000}k`} />
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: 'rgba(15,18,35,0.95)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px' }}
                    formatter={(v: number) => [`$${v.toLocaleString()}`, "Spend"]}
                  />
                  <Bar dataKey="spend" fill="#818cf8" radius={[4, 4, 0, 0]} opacity={0.8} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Top Campaigns */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 }}
            className="glass-card rounded-2xl p-5"
          >
            <h3 className="text-white font-semibold mb-4">Top Campaigns</h3>
            <div className="space-y-0">
              <div className="flex items-center justify-between text-xs text-gray-500 pb-2 border-b border-white/5 mb-2">
                <span>Campaign Name</span>
                <span>Rate</span>
              </div>
              {topCampaigns.map((c, i) => (
                <div key={i} className="flex items-center justify-between py-2.5 border-b border-white/5 last:border-0">
                  <span className="text-sm text-gray-200">{c.name}</span>
                  <span className="text-sm font-semibold text-cyan-400">{c.rate}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Conversions */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.24 }}
            className="glass-card rounded-2xl p-5 flex flex-col justify-center"
          >
            <h3 className="text-white font-semibold mb-2">Conversions</h3>
            <div className="text-5xl font-black text-white mt-3">12,500</div>
            <div className="flex items-center gap-1.5 mt-3 text-xs text-emerald-400">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
              +18.3% vs last period
            </div>
          </motion.div>
        </div>
      </div>
    </AppLayout>
  );
}
