import { Router, type IRouter } from "express";

const router: IRouter = Router();

const salesData = [
  { month: "Jan 2024", vendas: 145000000, despesas: 89000000, lucro: 56000000 },
  { month: "Fev 2024", vendas: 132000000, despesas: 81000000, lucro: 51000000 },
  { month: "Mar 2024", vendas: 178000000, despesas: 102000000, lucro: 76000000 },
  { month: "Abr 2024", vendas: 195000000, despesas: 115000000, lucro: 80000000 },
  { month: "Mai 2024", vendas: 221000000, despesas: 128000000, lucro: 93000000 },
  { month: "Jun 2024", vendas: 208000000, despesas: 119000000, lucro: 89000000 },
  { month: "Jul 2024", vendas: 245000000, despesas: 138000000, lucro: 107000000 },
  { month: "Ago 2024", vendas: 267000000, despesas: 149000000, lucro: 118000000 },
  { month: "Set 2024", vendas: 289000000, despesas: 162000000, lucro: 127000000 },
  { month: "Out 2024", vendas: 312000000, despesas: 178000000, lucro: 134000000 },
  { month: "Nov 2024", vendas: 354000000, despesas: 198000000, lucro: 156000000 },
  { month: "Dez 2024", vendas: 398000000, despesas: 215000000, lucro: 183000000 },
];

const salesByProvince = [
  { provincia: "Luanda", vendas: 1256000000, percentagem: 47.2 },
  { provincia: "Benguela", vendas: 487000000, percentagem: 18.3 },
  { provincia: "Huambo", vendas: 312000000, percentagem: 11.7 },
  { provincia: "Cabinda", vendas: 245000000, percentagem: 9.2 },
  { provincia: "Namibe", vendas: 178000000, percentagem: 6.7 },
  { provincia: "Malanje", vendas: 134000000, percentagem: 5.0 },
  { provincia: "Uíge", vendas: 52000000, percentagem: 1.9 },
];

const topProducts = [
  { produto: "Combustíveis", vendas: 789000000, unidades: 45230, crescimento: 23.4 },
  { produto: "Eletrônicos", vendas: 456000000, unidades: 12890, crescimento: 31.2 },
  { produto: "Alimentação", vendas: 378000000, unidades: 98450, crescimento: 8.7 },
  { produto: "Construção", vendas: 289000000, unidades: 23670, crescimento: 18.9 },
  { produto: "Farmácia", vendas: 198000000, unidades: 34560, crescimento: 14.3 },
  { produto: "Vestuário", vendas: 145000000, unidades: 67890, crescimento: -2.1 },
];

router.get("/dashboard/summary", async (_req, res): Promise<void> => {
  const totalRevenue = salesData.reduce((sum, d) => sum + d.vendas, 0);
  const totalOrders = 147832;
  const avgOrderValue = Math.round(totalRevenue / totalOrders);
  const growthRate = 34.7;
  const activeClients = 8924;
  const anomaliesDetected = 7;

  res.json({
    totalRevenue,
    totalOrders,
    avgOrderValue,
    growthRate,
    activeClients,
    anomaliesDetected,
  });
});

router.get("/dashboard/sales", async (_req, res): Promise<void> => {
  res.json(salesData);
});

router.get("/dashboard/sales-by-province", async (_req, res): Promise<void> => {
  res.json(salesByProvince);
});

router.get("/dashboard/top-products", async (_req, res): Promise<void> => {
  res.json(topProducts);
});

export default router;
