import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "wouter";
import {
  LayoutDashboard, TrendingUp, AlertTriangle, Plug,
  DollarSign, ShoppingCart, Percent, AlertCircle,
  ArrowUpRight, ArrowDownRight, Activity, Zap
} from "lucide-react";
import { ExportButton } from "@/components/export-button";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell,
  RadialBarChart, RadialBar, LineChart, Line
} from "recharts";
import { AppLayout } from "@/components/layout";
import { AIChatZone } from "@/components/ai-chat";
import { CalendarWidget } from "@/components/calendar-widget";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatAOA } from "@/lib/utils";
import {
  useGetDashboardSummary, getGetDashboardSummaryQueryKey,
  useGetSalesData, getGetSalesDataQueryKey,
  useGetSalesByProvince, getGetSalesByProvinceQueryKey,
  useGetTopProducts, getGetTopProductsQueryKey
} from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";

// Animated counter hook
function useCountUp(target: number, duration = 1200, active = true) {
  const [count, setCount] = useState(0);
  const frameRef = useRef<number>(0);
  useEffect(() => {
    if (!active || target === 0) return;
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
  }, [target, duration, active]);
  return count;
}

// Sparkline data
const sparkData = [
  [4, 7, 5, 9, 6, 8, 11, 9, 13, 12, 15, 14],
  [3, 5, 4, 6, 5, 7, 6, 8, 7, 9, 8, 10],
  [2, 3, 4, 3, 5, 4, 6, 5, 7, 6, 8, 7],
  [5, 4, 6, 5, 3, 4, 5, 6, 4, 5, 7, 6],
];

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const pts = data.map((v, i) => ({ v }));
  return (
    <ResponsiveContainer width="100%" height={36}>
      <LineChart data={pts} margin={{ top: 4, right: 0, left: 0, bottom: 4 }}>
        <Line type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

interface KpiCardProps {
  label: string;
  value: number;
  formatted: string;
  change: string;
  positive: boolean;
  icon: React.ElementType;
  iconClass: string;
  bgClass: string;
  sparkIndex: number;
  sparkColor: string;
  pulse: boolean;
  delay?: number;
}

function KpiCard({ label, value, formatted, change, positive, icon: Icon, iconClass, bgClass, sparkIndex, sparkColor, pulse, delay = 0 }: KpiCardProps) {
  const count = useCountUp(value, 1200, value > 0);
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
    >
      <Card className={`relative overflow-hidden transition-all duration-700 ${pulse ? "ring-1 ring-primary/60 shadow-[0_0_24px_rgba(56,189,248,0.2)]" : "shadow-[0_2px_12px_rgba(0,0,0,0.3)]"}`}>
        <CardContent className="p-5">
          <div className="flex justify-between items-start mb-3">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
              <div className="text-2xl font-bold mt-1 text-foreground tabular-nums">
                {formatted}
              </div>
            </div>
            <div className={`p-2.5 rounded-xl ${bgClass}`}>
              <Icon className={`w-4 h-4 ${iconClass}`} />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className={`flex items-center gap-1 text-xs font-medium ${positive ? "text-emerald-400" : "text-red-400"}`}>
              {positive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {change} vs. período anterior
            </div>
          </div>
          <div className="mt-2 -mx-1">
            <Sparkline data={sparkData[sparkIndex]} color={sparkColor} />
          </div>
        </CardContent>
        {pulse && (
          <div className="absolute inset-0 bg-primary/3 pointer-events-none" />
        )}
      </Card>
    </motion.div>
  );
}

const PROVINCE_COLORS = ["#38bdf8", "#818cf8", "#34d399", "#f59e0b", "#f472b6", "#a78bfa", "#60a5fa", "#fb923c"];

const recentActivity = [
  { time: "14:23", type: "anomaly", msg: "Luanda: queda 23% acima do limiar", color: "text-amber-400" },
  { time: "11:05", type: "ai", msg: "Modelo atualizado com dados de Abril", color: "text-primary" },
  { time: "09:47", type: "milestone", msg: "Meta Q2 atingida em Benguela", color: "text-emerald-400" },
  { time: "08:30", type: "anomaly", msg: "Cabinda: excedente de stock detectado", color: "text-amber-400" },
  { time: "Ontem", type: "ai", msg: "Previsão Maio gerada com 94.7% precisão", color: "text-primary" },
];

export default function Dashboard() {
  const [pulse, setPulse] = useState(false);
  const [liveTime, setLiveTime] = useState(new Date());
  const [aiMessages, setAiMessages] = useState<{ role: string; content: string }[]>([]);

  const { data: summary, isLoading: loadingSummary } = useGetDashboardSummary({
    query: { queryKey: getGetDashboardSummaryQueryKey() }
  });

  const { data: salesData, isLoading: loadingSales } = useGetSalesData({
    query: { queryKey: getGetSalesDataQueryKey() }
  });

  const { data: provinceData, isLoading: loadingProvince } = useGetSalesByProvince({
    query: { queryKey: getGetSalesByProvinceQueryKey() }
  });

  const { data: topProducts, isLoading: loadingProducts } = useGetTopProducts({
    query: { queryKey: getGetTopProductsQueryKey() }
  });

  useEffect(() => {
    const t = setInterval(() => setLiveTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const handlePulse = () => {
    setPulse(true);
    setTimeout(() => setPulse(false), 2500);
  };

  // Build pie data from province data
  const pieData = (provinceData || []).slice(0, 6).map((p, i) => ({
    name: p.provincia,
    value: p.vendas,
    fill: PROVINCE_COLORS[i],
  }));

  return (
    <AppLayout>
      <div className="space-y-6 pb-8">

        {/* Header */}
        <div className="flex items-start justify-between">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard Geral</h1>
            <p className="text-muted-foreground mt-1 text-sm">Visão global das operações e vendas em Angola.</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3 flex-shrink-0"
          >
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-card border border-border/50 rounded-xl px-3 py-2">
              <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span className="font-mono tabular-nums">
                {liveTime.toLocaleTimeString('pt-PT')}
              </span>
            </div>
            <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-xs gap-1.5">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
              Ao vivo
            </Badge>
            <ExportButton getData={() => ({
              summary,
              salesData,
              provinceData,
              topProducts,
              aiMessages,
            })} />
          </motion.div>
        </div>

        {/* AI Chat */}
        <AIChatZone onPulse={handlePulse} onMessagesChange={setAiMessages} />

        {/* Nav Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { href: "/", icon: LayoutDashboard, label: "Tempo Real", sub: "Dashboard", border: "border-primary/20", bg: "bg-primary/10", text: "text-primary", glow: "rgba(56,189,248,0.15)" },
            { href: "/predicoes", icon: TrendingUp, label: "Previsão", sub: "Modelos Preditivos", border: "border-secondary/20", bg: "bg-secondary/10", text: "text-secondary", glow: "rgba(129,140,248,0.15)" },
            { href: "/anomalias", icon: AlertTriangle, label: "Anomalias", sub: "7 detetadas", border: "border-amber-500/20", bg: "bg-amber-500/10", text: "text-amber-400", glow: "rgba(245,158,11,0.15)" },
            { href: "/integracoes", icon: Plug, label: "Conexões", sub: "Integrações", border: "border-secondary/20", bg: "bg-secondary/10", text: "text-secondary", glow: "rgba(129,140,248,0.15)" },
          ].map(({ href, icon: Icon, label, sub, border, bg, text, glow }, i) => (
            <Link href={href} key={href}>
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                whileHover={{ scale: 1.02 }}
              >
                <Card className={`cursor-pointer transition-all hover:shadow-[0_0_20px_${glow}] ${border} hover:border-opacity-50`}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className={`p-2.5 ${bg} rounded-xl flex-shrink-0`}>
                      <Icon className={`w-5 h-5 ${text}`} />
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-sm text-foreground truncate">{label}</div>
                      <div className="text-xs text-muted-foreground truncate">{sub}</div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </Link>
          ))}
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {loadingSummary ? (
            Array(4).fill(0).map((_, i) => (
              <Card key={i}><CardContent className="p-5"><Skeleton className="h-24 w-full" /></CardContent></Card>
            ))
          ) : (
            <>
              <KpiCard
                label="Receita Total"
                value={summary?.totalRevenue ?? 0}
                formatted={summary?.totalRevenue ? formatAOA(summary.totalRevenue) : "—"}
                change="+12.4%"
                positive={true}
                icon={DollarSign}
                iconClass="text-primary"
                bgClass="bg-primary/10"
                sparkIndex={0}
                sparkColor="#38bdf8"
                pulse={pulse}
                delay={0}
              />
              <KpiCard
                label="Total Pedidos"
                value={summary?.totalOrders ?? 0}
                formatted={summary?.totalOrders ? summary.totalOrders.toLocaleString('pt-PT') : "—"}
                change="+8.1%"
                positive={true}
                icon={ShoppingCart}
                iconClass="text-secondary"
                bgClass="bg-secondary/10"
                sparkIndex={1}
                sparkColor="#818cf8"
                pulse={pulse}
                delay={0.08}
              />
              <KpiCard
                label="Taxa de Crescimento"
                value={summary?.growthRate ?? 0}
                formatted={summary?.growthRate ? `+${summary.growthRate}%` : "—"}
                change="+3.2pp"
                positive={true}
                icon={Percent}
                iconClass="text-emerald-400"
                bgClass="bg-emerald-500/10"
                sparkIndex={2}
                sparkColor="#34d399"
                pulse={pulse}
                delay={0.16}
              />
              <KpiCard
                label="Anomalias Detetadas"
                value={summary?.anomaliesDetected ?? 0}
                formatted={summary?.anomaliesDetected?.toString() ?? "—"}
                change="-2 este mês"
                positive={false}
                icon={AlertCircle}
                iconClass="text-amber-400"
                bgClass="bg-amber-500/10"
                sparkIndex={3}
                sparkColor="#f59e0b"
                pulse={pulse}
                delay={0.24}
              />
            </>
          )}
        </div>

        {/* Main Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Area Chart - spans 2 cols */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2"
          >
            <Card className={`h-full transition-all duration-700 ${pulse ? "ring-1 ring-primary/50 shadow-[0_0_28px_rgba(56,189,248,0.15)]" : ""}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Vendas & Lucro Mensal</CardTitle>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-0.5 bg-primary rounded inline-block" />Vendas</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-0.5 bg-secondary rounded inline-block" />Lucro</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loadingSales ? (
                  <Skeleton className="h-[280px] w-full" />
                ) : (
                  <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={salesData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                        <defs>
                          <linearGradient id="gVendas" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.4} />
                            <stop offset="100%" stopColor="#38bdf8" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="gLucro" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#818cf8" stopOpacity={0.4} />
                            <stop offset="100%" stopColor="#818cf8" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                        <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`} />
                        <RechartsTooltip
                          contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '0.75rem', fontSize: '12px' }}
                          itemStyle={{ color: 'hsl(var(--foreground))' }}
                          formatter={(v: number) => formatAOA(v)}
                        />
                        <Area type="monotone" dataKey="vendas" stroke="#38bdf8" strokeWidth={2.5} fill="url(#gVendas)" />
                        <Area type="monotone" dataKey="lucro" stroke="#818cf8" strokeWidth={2.5} fill="url(#gLucro)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Province Pie Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className={`h-full transition-all duration-700 ${pulse ? "ring-1 ring-primary/50 shadow-[0_0_28px_rgba(56,189,248,0.15)]" : ""}`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Províncias</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingProvince ? (
                  <Skeleton className="h-[280px] w-full" />
                ) : (
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="60%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={42}
                          outerRadius={68}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {pieData.map((entry, i) => (
                            <Cell key={i} fill={entry.fill} opacity={0.9} />
                          ))}
                        </Pie>
                        <RechartsTooltip
                          contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '0.75rem', fontSize: '11px' }}
                          formatter={(v: number) => formatAOA(v)}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 px-1 mt-1">
                      {pieData.map((p, i) => (
                        <div key={i} className="flex items-center gap-1.5 text-xs">
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.fill }} />
                          <span className="text-muted-foreground truncate">{p.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Bottom Row: Bar chart + Calendar + Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Province Bar Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
          >
            <Card className={`h-full transition-all duration-700 ${pulse ? "ring-1 ring-primary/50 shadow-[0_0_28px_rgba(56,189,248,0.15)]" : ""}`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Ranking Províncias</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingProvince ? (
                  <Skeleton className="h-[280px] w-full" />
                ) : (
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={provinceData} layout="vertical" margin={{ top: 0, right: 12, left: 36, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} vertical={true} />
                        <XAxis type="number" hide />
                        <YAxis
                          dataKey="provincia"
                          type="category"
                          stroke="hsl(var(--muted-foreground))"
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                          width={56}
                        />
                        <RechartsTooltip
                          cursor={{ fill: 'rgba(56,189,248,0.05)' }}
                          contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '0.75rem', fontSize: '12px' }}
                          formatter={(v: number) => formatAOA(v)}
                        />
                        <Bar dataKey="vendas" radius={[0, 5, 5, 0]} barSize={18}>
                          {(provinceData || []).map((_, i) => (
                            <Cell key={i} fill={PROVINCE_COLORS[i % PROVINCE_COLORS.length]} opacity={0.85} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Calendar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="h-full">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Calendário de Eventos</CardTitle>
                  <Badge variant="outline" className="text-xs">
                    <Zap className="w-2.5 h-2.5 mr-1" />
                    5 eventos
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <CalendarWidget />
              </CardContent>
            </Card>
          </motion.div>

          {/* Activity Feed */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
          >
            <Card className="h-full">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Atividade Recente</CardTitle>
                  <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                    Ao vivo
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-0">
                {recentActivity.map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + i * 0.07 }}
                    className="flex gap-3 py-3 border-b border-border/40 last:border-0"
                  >
                    <div className="flex flex-col items-center gap-1 flex-shrink-0">
                      <span className="text-xs text-muted-foreground font-mono">{item.time}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-medium leading-tight ${item.color}`}>
                        {item.type === "anomaly" ? "⚡" : item.type === "ai" ? "🤖" : "✅"} {item.msg}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Top Products Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className={`transition-all duration-700 ${pulse ? "ring-1 ring-primary/50 shadow-[0_0_28px_rgba(56,189,248,0.15)]" : ""}`}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Top Produtos por Receita</CardTitle>
                <Badge variant="outline" className="text-xs text-muted-foreground">
                  2024 YTD
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {loadingProducts ? (
                <div className="space-y-3">
                  {Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead>
                      <tr className="text-xs text-muted-foreground uppercase bg-muted/30 border-b border-border">
                        <th className="px-4 py-3 rounded-tl-lg">#</th>
                        <th className="px-4 py-3">Produto</th>
                        <th className="px-4 py-3">Vendas Totais</th>
                        <th className="px-4 py-3">Unidades</th>
                        <th className="px-4 py-3 rounded-tr-lg text-right">Tendência</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topProducts?.map((product, i) => (
                        <motion.tr
                          key={i}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.6 + i * 0.05 }}
                          className="border-b border-border/30 hover:bg-muted/20 transition-colors"
                        >
                          <td className="px-4 py-3">
                            <span className="text-muted-foreground font-mono text-xs">{String(i + 1).padStart(2, "0")}</span>
                          </td>
                          <td className="px-4 py-3 font-medium text-foreground">{product.produto}</td>
                          <td className="px-4 py-3 tabular-nums">{formatAOA(product.vendas)}</td>
                          <td className="px-4 py-3 tabular-nums text-muted-foreground">{product.unidades.toLocaleString('pt-PT')}</td>
                          <td className="px-4 py-3 text-right">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                              product.crescimento > 0
                                ? 'bg-emerald-500/10 text-emerald-400'
                                : 'bg-red-500/10 text-red-400'
                            }`}>
                              {product.crescimento > 0
                                ? <ArrowUpRight className="w-3 h-3" />
                                : <ArrowDownRight className="w-3 h-3" />
                              }
                              {Math.abs(product.crescimento)}%
                            </span>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

      </div>
    </AppLayout>
  );
}
