import { Router, type IRouter } from "express";

const router: IRouter = Router();

const forecastData = [
  { month: "Out 2024", previsto: 312000000, minimo: 287000000, maximo: 337000000, real: 312000000 },
  { month: "Nov 2024", previsto: 348000000, minimo: 318000000, maximo: 378000000, real: 354000000 },
  { month: "Dez 2024", previsto: 391000000, minimo: 356000000, maximo: 426000000, real: 398000000 },
  { month: "Jan 2025", previsto: 378000000, minimo: 341000000, maximo: 415000000, real: null },
  { month: "Fev 2025", previsto: 412000000, minimo: 371000000, maximo: 453000000, real: null },
  { month: "Mar 2025", previsto: 467000000, minimo: 419000000, maximo: 515000000, real: null },
  { month: "Abr 2025", previsto: 498000000, minimo: 446000000, maximo: 550000000, real: null },
  { month: "Mai 2025", previsto: 534000000, minimo: 478000000, maximo: 590000000, real: null },
  { month: "Jun 2025", previsto: 512000000, minimo: 459000000, maximo: 565000000, real: null },
];

router.get("/predictions/forecast", async (_req, res): Promise<void> => {
  res.json(forecastData);
});

router.get("/predictions/confidence", async (_req, res): Promise<void> => {
  res.json({
    accuracy: 94.7,
    mae: 12400000,
    rmse: 18900000,
    r2Score: 0.947,
    modelName: "ELEVEN Predictive Engine v2.3",
    lastTrained: "2025-01-15T08:30:00Z",
  });
});

export default router;
