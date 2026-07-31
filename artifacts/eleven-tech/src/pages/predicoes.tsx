import { AppLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  useGetSalesForecast, getGetSalesForecastQueryKey,
  useGetPredictionConfidence, getGetPredictionConfidenceQueryKey
} from "@workspace/api-client-react";
import { 
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip as RechartsTooltip, ResponsiveContainer, Legend, ComposedChart
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { formatAOA } from "@/lib/utils";

export default function Predicoes() {
  const { data: forecast, isLoading: loadingForecast } = useGetSalesForecast({
    query: { queryKey: getGetSalesForecastQueryKey() }
  });

  const { data: confidence, isLoading: loadingConfidence } = useGetPredictionConfidence({
    query: { queryKey: getGetPredictionConfidenceQueryKey() }
  });

  return (
    <AppLayout>
      <div className="space-y-8 pb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Análise Preditiva</h1>
          <p className="text-muted-foreground mt-1">Previsões de vendas baseadas em machine learning com bandas de confiança.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          <div className="lg:col-span-3 space-y-8">
            <Card className="border-secondary/20 shadow-[0_0_30px_rgba(129,140,248,0.05)]">
              <CardHeader>
                <CardTitle>Previsão de Vendas (Próximos Meses)</CardTitle>
                <CardDescription>O modelo projeta a tendência com base no histórico da "vendas_angola.csv"</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingForecast ? (
                  <Skeleton className="h-[400px] w-full" />
                ) : (
                  <div className="h-[400px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={forecast} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                        <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                        <YAxis stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} tickFormatter={(val) => `${val / 1000}k`} />
                        <RechartsTooltip 
                          contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '0.5rem' }}
                          formatter={(value: number) => formatAOA(value)}
                        />
                        <Legend wrapperStyle={{ paddingTop: '20px' }} />
                        
                        {/* Confidence Band */}
                        <Area type="monotone" dataKey="maximo" stroke="none" fill="hsl(var(--secondary))" fillOpacity={0.1} activeDot={false} />
                        <Area type="monotone" dataKey="minimo" stroke="none" fill="hsl(var(--background))" fillOpacity={1} activeDot={false} />
                        
                        {/* Actual Sales */}
                        <Line type="monotone" dataKey="real" name="Vendas Reais" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                        
                        {/* Predicted Sales */}
                        <Line type="monotone" dataKey="previsto" name="Previsão" stroke="hsl(var(--secondary))" strokeWidth={3} strokeDasharray="5 5" dot={{ r: 4 }} activeDot={{ r: 6 }} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold mb-4">Métricas do Modelo</h3>
            
            {loadingConfidence ? (
              <div className="space-y-4">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            ) : confidence ? (
              <>
                <Card className="bg-card/50">
                  <CardContent className="p-4">
                    <div className="text-sm text-muted-foreground mb-1">Modelo Ativo</div>
                    <div className="font-mono text-sm text-primary">{confidence.modelName}</div>
                    <div className="text-xs text-muted-foreground mt-2">Treinado: {new Date(confidence.lastTrained).toLocaleDateString()}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm text-muted-foreground mb-1">Precisão (Accuracy)</div>
                    <div className="text-2xl font-bold text-foreground">{(confidence.accuracy * 100).toFixed(1)}%</div>
                    <div className="w-full bg-muted rounded-full h-1.5 mt-3">
                      <div className="bg-primary h-1.5 rounded-full" style={{ width: `${confidence.accuracy * 100}%` }}></div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm text-muted-foreground mb-1">Erro Médio Absoluto (MAE)</div>
                    <div className="text-xl font-bold text-foreground">{formatAOA(confidence.mae)}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm text-muted-foreground mb-1">R² Score</div>
                    <div className="text-xl font-bold text-foreground">{confidence.r2Score.toFixed(3)}</div>
                  </CardContent>
                </Card>
              </>
            ) : null}
          </div>

        </div>
      </div>
    </AppLayout>
  );
}
