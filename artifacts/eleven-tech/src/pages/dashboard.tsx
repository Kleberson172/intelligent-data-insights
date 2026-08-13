import { useState, useRef, useEffect } from "react";
import { ArrowUpRight, ArrowDownRight, DollarSign, ShoppingBag, Users, AlertTriangle, TrendingUp, TrendingDown, Package } from "lucide-react";
import { AppLayout } from "@/components/layout";
import { AIChatZone } from "@/components/ai-chat";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, LineChart, Line
} from "recharts";
import { motion } from "framer-motion";
import {
  useGetDashboardSummary,
  useGetSalesData,
  useGetTopProducts,
  useGetAnomalyStats,
} from "@workspace/api-client-react";

// "Encomendas Recentes" ainda não tem endpoint no backend (não existe tabela de
// encomendas/orders). Fica vazio até essa funcionalidade ser implementada.
const encomendas: { id: string; cliente: string; estado: string; total: string }[] = [];

const ESTADO_CORES: Record<string, string> = {
  Pendente: "text-yellow-400 bg-yellow-400/10 border-yellow-400/30",
  Enviado: "text-blue-400 bg-blue-400/10 border-blue-400/30",
  Entregue: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30",
  "Em Processo": "text-purple-400 bg-purple-400/10 border-purple-400/30",
};

function useCountUp(target: number, duration = 1200) {
  const [count, setCount] = useState(0);
  const frameRef = useRef<number>(0);
  useEffect(() => {
    if (!target) {
      setCount(0);
      return;
    }
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

function StatCard({ icon: Icon, label, value, change, positive = true, color, delay = 0 }: {
  icon: React.ElementType; label: string; value: string; change: string; positive?: boolean; color: string; delay?: number;
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
      <div className={`flex items-center gap-1 text-xs ${positive ? "text-emerald-400" : "text-red-400"}`}>
        {positive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
        <span>{change} vs. mês anterior</span>
      </div>
    </motion.div>
  );
}

const formatAOA = (v: number) => {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return v.toString();
};

export default function Dashboard() {
  const summaryQuery = useGetDashboardSummary();
  const salesQuery = useGetSalesData();
  const topProductsQuery = useGetTopProducts();
  const anomalyStatsQuery = useGetAnomalyStats();

  const summary = summaryQuery.data;
  const salesData = salesQuery.data ?? [];
  const topProducts = topProductsQuery.data ?? [];
  const anomalyStats = anomalyStatsQuery.data;

  const receita = useCountUp(summary?.totalRevenue ?? 0);
  const isUsingRealData = (summary as { source?: string } | undefined)?.source === "real";

  return (
    <AppLayout title="Dashboard">
      <div className="space-y-5">
        {!summaryQuery.isLoading && !isUsingRealData && (
          <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-2.5 text-xs text-amber-300">
            A mostrar dados de demonstração. Carrega um ficheiro CSV em "Integrações" para ver os teus dados reais.
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={DollarSign}
            label="Receita Total"
            value={summaryQuery.isLoading ? "…" : `${receita.toLocaleString("pt-PT")} AOA`}
            change={summary ? `${summary.growthRate}%` : "0%"}
            positive={(summary?.growthRate ?? 0) >= 0}
            color="bg-cyan-500/15 text-cyan-400"
            delay={0}
          />
          <StatCard
            icon={ShoppingBag}
            label="Total de Encomendas"
            value={summaryQuery.isLoading ? "…" : (summary?.totalOrders ?? 0).toLocaleString("pt-PT")}
            change={summary ? `${summary.growthRate}%` : "0%"}
            positive={(summary?.growthRate ?? 0) >= 0}
            color="bg-indigo-500/15 text-indigo-400"
            delay={0.06}
          />
          <StatCard
            icon={Users}
            label="Clientes Activos"
            value={summaryQuery.isLoading ? "…" : (summary?.activeClients ?? 0).toLocaleString("pt-PT")}
            change="0%"
            positive
            color="bg-purple-500/15 text-purple-400"
            delay={0.12}
          />
          <StatCard
            icon={AlertTriangle}
            label="Alertas Pendentes"
            value={summaryQuery.isLoading ? "…" : (summary?.anomaliesDetected ?? 0).toLocaleString("pt-PT")}
            change="0%"
            positive={false}
            color="bg-amber-500/15 text-amber-400"
            delay={0.18}
          />
        </div>

        {/* Agente de IA */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22, duration: 0.4 }}>
          <AIChatZone />
        </motion.div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Sales chart */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28, duration: 0.4 }}
            className="lg:col-span-2 glass-card rounded-2xl p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-white font-semibold">Visão Geral de Vendas</h3>
                <p className="text-gray-400 text-xs mt-0.5">Vendas Mensais (AOA)</p>
              </div>
              <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                Ao Vivo
              </span>
            </div>
            <div className="h-[200px]">
              {salesData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-gray-500">
                  {salesQuery.isLoading ? "A carregar…" : "Sem dados de vendas ainda"}
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={salesData} margin={{ top: 8, right: 4, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gVendas" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#818cf8" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="#818cf8" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="month" stroke="rgba(255,255,255,0.3)" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="rgba(255,255,255,0.3)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={formatAOA} />
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: "rgba(15,18,35,0.95)", borderColor: "rgba(255,255,255,0.1)", borderRadius: "12px", fontSize: "12px" }}
                      formatter={(v: number) => [`${v.toLocaleString("pt-PT")} AOA`, "Vendas"]}
                    />
                    <Area type="monotone" dataKey="vendas" stroke="#818cf8" strokeWidth={2.5} fill="url(#gVendas)" dot={{ fill: "#818cf8", r: 4, strokeWidth: 0 }} activeDot={{ r: 5, fill: "#818cf8" }} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </motion.div>

          {/* Recent orders */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.34, duration: 0.4 }}
            className="glass-card rounded-2xl p-5"
          >
            <h3 className="text-white font-semibold mb-4">Encomendas Recentes</h3>
            <div>
              <div className="grid grid-cols-4 text-xs text-gray-500 pb-2 border-b border-white/5 mb-2">
                <span>Nº</span>
                <span>Cliente</span>
                <span>Estado</span>
                <span className="text-right">Total</span>
              </div>
              {encomendas.length === 0 ? (
                <div className="py-8 text-center text-xs text-gray-500">
                  Sem encomendas registadas
                </div>
              ) : (
                encomendas.map((enc) => (
                  <div key={enc.id} className="grid grid-cols-4 text-xs py-2.5 border-b border-white/5 last:border-0 items-center gap-1">
                    <span className="text-gray-300 font-mono text-[10px]">{enc.id}</span>
                    <span className="text-gray-300 truncate">{enc.cliente}</span>
                    <span>
                      <span className={`px-1.5 py-0.5 rounded-full border text-[9px] font-medium ${ESTADO_CORES[enc.estado]}`}>
                        {enc.estado}
                      </span>
                    </span>
                    <span className="text-white font-medium text-right text-[9px]">{enc.total}</span>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </div>

        {/* Bottom row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Top products */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.4 }}
            className="glass-card rounded-2xl p-5"
          >
            <h3 className="text-white font-semibold mb-4">Top Produtos</h3>
            <div className="space-y-3">
              {topProducts.length === 0 ? (
                <div className="py-8 text-center text-xs text-gray-500">
                  {topProductsQuery.isLoading ? "A carregar…" : "Sem dados de produtos ainda"}
                </div>
              ) : (
                topProducts.map((p) => (
                  <div key={p.produto} className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0">
                      <Package size={18} className="text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white font-medium truncate">{p.produto}</div>
                      <div className="text-xs text-gray-400">
                        {p.unidades.toLocaleString("pt-PT")} unidades · {formatAOA(p.vendas)} AOA
                      </div>
                    </div>
                    {p.crescimento >= 0 ? (
                      <TrendingUp size={14} className="text-emerald-400 flex-shrink-0" />
                    ) : (
                      <TrendingDown size={14} className="text-red-400 flex-shrink-0" />
                    )}
                  </div>
                ))
              )}
            </div>
          </motion.div>

          {/* Active clients */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.46, duration: 0.4 }}
            className="glass-card rounded-2xl p-5 flex flex-col justify-between"
          >
            <div>
              <h3 className="text-white font-semibold mb-1">Clientes Activos</h3>
              <div className="text-5xl font-bold text-cyan-400 mt-3 mb-2">
                {summaryQuery.isLoading ? "…" : (summary?.activeClients ?? 0).toLocaleString("pt-PT")}
              </div>
              <div className="text-xs text-gray-400">Clientes na plataforma este mês</div>
            </div>
            <div className="h-[80px] mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={salesData}>
                  <Line type="monotone" dataKey="vendas" stroke="#38bdf8" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Pending alerts */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.52, duration: 0.4 }}
            className="glass-card rounded-2xl p-5 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-white font-semibold">Alertas Pendentes</h3>
                <AlertTriangle size={16} className="text-amber-400" />
              </div>
              <div className="text-5xl font-bold text-amber-400 mt-3 mb-2">
                {anomalyStatsQuery.isLoading ? "…" : (anomalyStats?.totalDetected ?? 0)}
              </div>
              <div className="text-xs text-gray-400">Requerem atenção</div>
            </div>
            <div className="space-y-2 mt-4">
              {[
                { label: "Crítico", valor: anomalyStats?.critical ?? 0, color: "bg-red-500" },
                { label: "Alto", valor: anomalyStats?.warning ?? 0, color: "bg-amber-500" },
                { label: "Médio", valor: anomalyStats?.info ?? 0, color: "bg-yellow-500" },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-2 text-xs">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${item.color}`} />
                  <span className="text-gray-400 flex-1">{item.label}</span>
                  <span className="text-white font-medium">{item.valor}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </AppLayout>
  );
}
