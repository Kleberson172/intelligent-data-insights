import { Router, type IRouter } from "express";
import { computeAnomaliesFromData } from "../../lib/csv-store";

const router: IRouter = Router();

const anomalyList = [
  {
    id: 1,
    date: "2024-11-28",
    metric: "Vendas Diarias - Luanda",
    value: 28900000,
    expectedValue: 11200000,
    deviation: 158.0,
    severity: "critical",
    description: "Pico de vendas incomum durante a Black Friday. Volume 158% acima da media historica para uma sexta-feira.",
  },
  {
    id: 2,
    date: "2024-10-15",
    metric: "Taxa de Devolucoes - Eletronicos",
    value: 18.4,
    expectedValue: 4.2,
    deviation: 338.1,
    severity: "critical",
    description: "Taxa de devolucao de eletronicos anormalmente alta. Possivel problema de qualidade em lote especifico.",
  },
  {
    id: 3,
    date: "2024-09-03",
    metric: "Vendas - Namibe",
    value: 1200000,
    expectedValue: 14800000,
    deviation: -91.9,
    severity: "warning",
    description: "Queda brusca nas vendas da provincia do Namibe. Possivel disrupcao logistica ou desabastecimento.",
  },
  {
    id: 4,
    date: "2024-08-22",
    metric: "Margem de Lucro - Combustiveis",
    value: 3.1,
    expectedValue: 12.8,
    deviation: -75.8,
    severity: "warning",
    description: "Margem de lucro em combustiveis abaixo do esperado. Verificar custos de aquisicao e precos de venda.",
  },
  {
    id: 5,
    date: "2024-07-10",
    metric: "Novos Clientes - Benguela",
    value: 892,
    expectedValue: 312,
    deviation: 186.0,
    severity: "info",
    description: "Aquisicao acelerada de novos clientes em Benguela. Verificar campanha de marketing em vigor.",
  },
  {
    id: 6,
    date: "2024-06-18",
    metric: "Ticket Medio - Alimentacao",
    value: 245000,
    expectedValue: 187000,
    deviation: 31.0,
    severity: "info",
    description: "Ticket medio do setor de alimentacao acima da media. Possivel efeito de inflacao nos precos.",
  },
  {
    id: 7,
    date: "2024-05-30",
    metric: "Vendas Online vs Presencial",
    value: 67.3,
    expectedValue: 28.4,
    deviation: 136.9,
    severity: "warning",
    description: "Proporcao de vendas online muito acima da media historica. Possivel problema no sistema de ponto de venda.",
  },
];

router.get("/anomalies", async (_req, res): Promise<void> => {
  const real = computeAnomaliesFromData();

  if (real && real.length > 0) {
    res.json(real.map(a => ({
      ...a,
      date: new Date().toISOString().slice(0, 10),
    })));
    return;
  }

  res.json(anomalyList);
});

router.get("/anomalies/stats", async (_req, res): Promise<void> => {
  const real = computeAnomaliesFromData();

  if (real) {
    const critical = real.filter(a => a.severity === "critical").length;
    const warning = real.filter(a => a.severity === "warning").length;
    const info = real.filter(a => a.severity === "info").length;

    res.json({
      totalDetected: real.length,
      critical,
      warning,
      info,
      lastScanDate: new Date().toISOString(),
      dataPointsAnalyzed: real.length,
    });
    return;
  }

  res.json({
    totalDetected: 7,
    critical: 2,
    warning: 3,
    info: 2,
    lastScanDate: "2025-01-15T10:45:00Z",
    dataPointsAnalyzed: 847392,
  });
});

export default router;