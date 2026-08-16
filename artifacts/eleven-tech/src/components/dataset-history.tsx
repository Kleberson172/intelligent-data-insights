import { useEffect, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { History, Loader2, RotateCcw, GitCompare, X } from "lucide-react";
import {
  getGetDashboardSummaryQueryKey,
  getGetSalesDataQueryKey,
  getGetTopProductsQueryKey,
  getGetAnomalyStatsQueryKey,
  getGetSalesForecastQueryKey,
  getGetPredictionConfidenceQueryKey,
} from "@workspace/api-client-react";

interface HistoryItem {
  id: string;
  filename: string;
  rowCount: number;
  uploadedAt: string;
  isActive: boolean;
}

interface Metrics {
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  activeClients: number;
}

function formatDate(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-PT", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function formatAOA(v: number): string {
  return `${v.toLocaleString("pt-PT", { maximumFractionDigits: 0 })} AOA`;
}

// Diferença percentual entre dois valores, formatada com sinal (+/-).
function deltaLabel(from: number, to: number): { text: string; positive: boolean } {
  if (from === 0) return { text: "—", positive: true };
  const pct = ((to - from) / from) * 100;
  return { text: `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`, positive: pct >= 0 };
}

export function DatasetHistoryCard() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activatingId, setActivatingId] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [comparing, setComparing] = useState(false);
  const [comparison, setComparison] = useState<{ a: Metrics; b: Metrics } | null>(null);
  const [compareError, setCompareError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const invalidateDashboardQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetSalesDataQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetTopProductsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetAnomalyStatsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetSalesForecastQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetPredictionConfidenceQueryKey() });
  }, [queryClient]);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/data/history", { credentials: "include" });
      if (res.ok) setItems(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  async function handleActivate(id: string) {
    setActivatingId(id);
    try {
      const res = await fetch(`/api/data/history/${id}/activate`, { method: "POST", credentials: "include" });
      if (res.ok) {
        await fetchHistory();
        invalidateDashboardQueries();
      }
    } finally {
      setActivatingId(null);
    }
  }

  function toggleSelect(id: string) {
    setComparison(null);
    setCompareError(null);
    setSelected(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= 2) return [prev[1], id]; // mantém só os 2 mais recentes selecionados
      return [...prev, id];
    });
  }

  async function handleCompare() {
    if (selected.length !== 2) return;
    setComparing(true);
    setCompareError(null);
    try {
      const res = await fetch(`/api/data/history/compare?a=${selected[0]}&b=${selected[1]}`, { credentials: "include" });
      const data = await res.json();
      if (res.ok) {
        setComparison(data);
      } else {
        setCompareError(data.error ?? "Não foi possível comparar estes datasets.");
      }
    } catch {
      setCompareError("Erro de ligação ao servidor.");
    } finally {
      setComparing(false);
    }
  }

  if (loading) {
    return (
      <Card className="border-white/10">
        <CardContent className="p-5 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> A carregar histórico...
        </CardContent>
      </Card>
    );
  }

  if (items.length === 0) return null;

  const itemA = items.find(i => i.id === selected[0]);
  const itemB = items.find(i => i.id === selected[1]);

  return (
    <Card className="border-white/10">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="w-4 h-4" /> Histórico de Datasets
        </CardTitle>
        <CardDescription>
          Os últimos {items.length} datasets carregados. Seleciona 2 para comparar, ou ativa um anterior.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.map((item) => (
          <div
            key={item.id}
            className={`flex items-center justify-between gap-3 p-2.5 rounded-lg border text-sm transition-colors ${
              selected.includes(item.id) ? "border-cyan-500/40 bg-cyan-500/5" : "border-white/5 bg-white/[0.02]"
            }`}
          >
            <button
              onClick={() => toggleSelect(item.id)}
              className="flex items-center gap-2.5 flex-1 min-w-0 text-left"
              title="Selecionar para comparar"
            >
              <div className={`w-4 h-4 rounded border shrink-0 flex items-center justify-center ${selected.includes(item.id) ? "bg-cyan-500 border-cyan-500" : "border-white/20"}`}>
                {selected.includes(item.id) && <span className="w-1.5 h-1.5 bg-[#0a0e14] rounded-sm" />}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground truncate">{item.filename}</span>
                  {item.isActive && (
                    <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-400 bg-emerald-500/5 shrink-0">
                      Ativo
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {item.rowCount.toLocaleString("pt-PT")} linhas · {formatDate(item.uploadedAt)}
                </p>
              </div>
            </button>
            {!item.isActive && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs bg-background hover:bg-cyan-500/10 hover:border-cyan-500/30 hover:text-cyan-400 gap-1 shrink-0"
                disabled={activatingId === item.id}
                onClick={() => handleActivate(item.id)}
              >
                {activatingId === item.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                Ativar
              </Button>
            )}
          </div>
        ))}

        {selected.length === 2 && (
          <div className="pt-2 border-t border-white/5 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Comparar <span className="text-foreground">{itemA?.filename}</span> vs <span className="text-foreground">{itemB?.filename}</span>
              </p>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => { setSelected([]); setComparison(null); }}>
                  <X className="w-3 h-3" /> Limpar seleção
                </Button>
                <Button size="sm" className="h-7 text-xs bg-cyan-500 hover:bg-cyan-400 text-[#0a0e14] gap-1" disabled={comparing} onClick={handleCompare}>
                  {comparing ? <Loader2 className="w-3 h-3 animate-spin" /> : <GitCompare className="w-3 h-3" />}
                  Comparar
                </Button>
              </div>
            </div>

            {compareError && (
              <p className="text-xs text-red-400">{compareError}</p>
            )}

            {comparison && (
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="text-muted-foreground">Indicador</div>
                <div className="text-muted-foreground truncate">{itemA?.filename}</div>
                <div className="text-muted-foreground truncate">{itemB?.filename}</div>

                <div className="text-foreground">Receita Total</div>
                <div>{formatAOA(comparison.a.totalRevenue)}</div>
                <div className="flex items-center gap-1.5">
                  {formatAOA(comparison.b.totalRevenue)}
                  <span className={deltaLabel(comparison.a.totalRevenue, comparison.b.totalRevenue).positive ? "text-emerald-400" : "text-red-400"}>
                    {deltaLabel(comparison.a.totalRevenue, comparison.b.totalRevenue).text}
                  </span>
                </div>

                <div className="text-foreground">Encomendas</div>
                <div>{comparison.a.totalOrders.toLocaleString("pt-PT")}</div>
                <div className="flex items-center gap-1.5">
                  {comparison.b.totalOrders.toLocaleString("pt-PT")}
                  <span className={deltaLabel(comparison.a.totalOrders, comparison.b.totalOrders).positive ? "text-emerald-400" : "text-red-400"}>
                    {deltaLabel(comparison.a.totalOrders, comparison.b.totalOrders).text}
                  </span>
                </div>

                <div className="text-foreground">Valor Médio</div>
                <div>{formatAOA(comparison.a.avgOrderValue)}</div>
                <div className="flex items-center gap-1.5">
                  {formatAOA(comparison.b.avgOrderValue)}
                  <span className={deltaLabel(comparison.a.avgOrderValue, comparison.b.avgOrderValue).positive ? "text-emerald-400" : "text-red-400"}>
                    {deltaLabel(comparison.a.avgOrderValue, comparison.b.avgOrderValue).text}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
