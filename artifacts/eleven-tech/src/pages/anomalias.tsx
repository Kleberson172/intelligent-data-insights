import { AppLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  useGetAnomalies, getGetAnomaliesQueryKey,
  useGetAnomalyStats, getGetAnomalyStatsQueryKey
} from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatAOA } from "@/lib/utils";
import { AlertTriangle, AlertCircle, Info, Activity } from "lucide-react";

export default function Anomalias() {
  const { data: anomalies, isLoading: loadingAnomalies } = useGetAnomalies({
    query: { queryKey: getGetAnomaliesQueryKey() }
  });

  const { data: stats, isLoading: loadingStats } = useGetAnomalyStats({
    query: { queryKey: getGetAnomalyStatsQueryKey() }
  });

  return (
    <AppLayout>
      <div className="space-y-8 pb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Deteção de Anomalias</h1>
          <p className="text-muted-foreground mt-1">Monitorização contínua de desvios padrão nos dados de vendas.</p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Total Detetado</p>
                  <p className="text-2xl font-bold">
                    {loadingStats ? <Skeleton className="h-8 w-16" /> : stats?.totalDetected}
                  </p>
                </div>
                <div className="p-2 bg-primary/10 text-primary rounded-lg">
                  <Activity className="w-4 h-4" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-red-500/20">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Críticas</p>
                  <p className="text-2xl font-bold text-red-500">
                    {loadingStats ? <Skeleton className="h-8 w-16" /> : stats?.critical}
                  </p>
                </div>
                <div className="p-2 bg-red-500/10 text-red-500 rounded-lg">
                  <AlertTriangle className="w-4 h-4" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-amber-500/20">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Avisos</p>
                  <p className="text-2xl font-bold text-amber-500">
                    {loadingStats ? <Skeleton className="h-8 w-16" /> : stats?.warning}
                  </p>
                </div>
                <div className="p-2 bg-amber-500/10 text-amber-500 rounded-lg">
                  <AlertCircle className="w-4 h-4" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-blue-500/20">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Informacionais</p>
                  <p className="text-2xl font-bold text-blue-500">
                    {loadingStats ? <Skeleton className="h-8 w-16" /> : stats?.info}
                  </p>
                </div>
                <div className="p-2 bg-blue-500/10 text-blue-500 rounded-lg">
                  <Info className="w-4 h-4" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Anomalies List */}
        <Card className="border-primary/20 shadow-[0_0_30px_rgba(56,189,248,0.03)]">
          <CardHeader>
            <CardTitle>Registo de Eventos Anómalos</CardTitle>
            <CardDescription>
              {loadingStats ? <Skeleton className="h-4 w-64" /> : `Último scan: ${new Date(stats?.lastScanDate || '').toLocaleString()} (${stats?.dataPointsAnalyzed.toLocaleString('pt-PT')} pontos analisados)`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingAnomalies ? (
              <div className="space-y-4">
                {[1,2,3,4].map(i => <Skeleton key={i} className="h-20 w-full" />)}
              </div>
            ) : anomalies?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma anomalia detetada no período atual.
              </div>
            ) : (
              <div className="space-y-4">
                {anomalies?.map((anomaly) => {
                  let badgeVariant = "outline";
                  let badgeColor = "";
                  let Icon = Info;
                  
                  if (anomaly.severity === 'critical') {
                    badgeColor = "bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20";
                    Icon = AlertTriangle;
                  } else if (anomaly.severity === 'warning') {
                    badgeColor = "bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500/20";
                    Icon = AlertCircle;
                  } else {
                    badgeColor = "bg-blue-500/10 text-blue-500 border-blue-500/20 hover:bg-blue-500/20";
                  }

                  return (
                    <div key={anomaly.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-border/50 bg-card hover:bg-muted/50 transition-colors gap-4">
                      <div className="flex items-start gap-4">
                        <div className={`mt-1 p-2 rounded-lg ${badgeColor.split(' ')[0]} ${badgeColor.split(' ')[1]}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-foreground">{anomaly.metric}</span>
                            <Badge variant="outline" className={badgeColor}>{anomaly.severity.toUpperCase()}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{anomaly.description}</p>
                          <p className="text-xs text-muted-foreground mt-2">{new Date(anomaly.date).toLocaleDateString('pt-PT', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                        </div>
                      </div>
                      <div className="sm:text-right bg-muted/30 p-3 rounded-lg border border-border/50">
                        <div className="text-sm text-muted-foreground mb-1">Valor Registado vs Esperado</div>
                        <div className="font-mono flex items-center sm:justify-end gap-2 text-sm">
                          <span className="text-foreground">{formatAOA(anomaly.value)}</span>
                          <span className="text-muted-foreground">/</span>
                          <span className="text-muted-foreground line-through">{formatAOA(anomaly.expectedValue)}</span>
                        </div>
                        <div className={`text-xs mt-1 font-medium ${anomaly.deviation > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                          Desvio de {anomaly.deviation > 0 ? '+' : ''}{anomaly.deviation.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
