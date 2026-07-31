import { Router, type IRouter } from "express";

const router: IRouter = Router();

const anomalyList = [
  {
    id: 1,
    date: "2024-11-28",
    metric: "Vendas Diárias - Luanda",
    value: 28900000,
    expectedValue: 11200000,
    deviation: 158.0,
    severity: "critical",
    description: "Pico de vendas incomum durante a Black Friday. Volume 158% acima da média histórica para uma sexta-feira.",
  },
  {
    id: 2,
    date: "2024-10-15",
    metric: "Taxa de Devoluções - Eletrônicos",
    value: 18.4,
    expectedValue: 4.2,
    deviation: 338.1,
    severity: "critical",
    description: "Taxa de devolução de eletrônicos anormalmente alta. Possível problema de qualidade em lote específico.",
  },
  {
    id: 3,
    date: "2024-09-03",
    metric: "Vendas - Namibe",
    value: 1200000,
    expectedValue: 14800000,
    deviation: -91.9,
    severity: "warning",
    description: "Queda brusca nas vendas da província do Namibe. Possível disrupção logística ou desabastecimento.",
  },
  {
    id: 4,
    date: "2024-08-22",
    metric: "Margem de Lucro - Combustíveis",
    value: 3.1,
    expectedValue: 12.8,
    deviation: -75.8,
    severity: "warning",
    description: "Margem de lucro em combustíveis abaixo do esperado. Verificar custos de aquisição e preços de venda.",
  },
  {
    id: 5,
    date: "2024-07-10",
    metric: "Novos Clientes - Benguela",
    value: 892,
    expectedValue: 312,
    deviation: 186.0,
    severity: "info",
    description: "Aquisição acelerada de novos clientes em Benguela. Verificar campanha de marketing em vigor.",
  },
  {
    id: 6,
    date: "2024-06-18",
    metric: "Ticket Médio - Alimentação",
    value: 245000,
    expectedValue: 187000,
    deviation: 31.0,
    severity: "info",
    description: "Ticket médio do setor de alimentação acima da média. Possível efeito de inflação nos preços.",
  },
  {
    id: 7,
    date: "2024-05-30",
    metric: "Vendas Online vs Presencial",
    value: 67.3,
    expectedValue: 28.4,
    deviation: 136.9,
    severity: "warning",
    description: "Proporção de vendas online muito acima da média histórica. Possível problema no sistema de ponto de venda.",
  },
];

router.get("/anomalies", async (_req, res): Promise<void> => {
  res.json(anomalyList);
});

router.get("/anomalies/stats", async (_req, res): Promise<void> => {
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
