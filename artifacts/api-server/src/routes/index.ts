import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import openaiRouter from "./openai";
import dashboardRouter from "./dashboard";
import predictionsRouter from "./predictions";
import anomaliesRouter from "./anomalies";
import dataRouter from "./data";
import integrationsRouter from "./integrations";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(openaiRouter);
router.use(dashboardRouter);
router.use(predictionsRouter);
router.use(anomaliesRouter);
router.use(dataRouter);
router.use(integrationsRouter);
router.use(adminRouter);

export default router;
