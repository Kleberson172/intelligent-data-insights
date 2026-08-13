import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import rateLimit from "express-rate-limit";
import router from "./routes";
import { logger } from "./lib/logger";
import { authMiddleware } from "./middlewares/authMiddleware";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

// Em produção, restringe as origens permitidas via FRONTEND_URL (uma ou
// várias, separadas por vírgula). Em desenvolvimento, se não estiver
// definido, aceita qualquer origem local para não travar o setup local.
const allowedOrigins = process.env.FRONTEND_URL?.split(",").map(o => o.trim());
app.use(
  cors({
    credentials: true,
    origin: allowedOrigins ?? (process.env.NODE_ENV === "production" ? false : true),
  }),
);

// Limite geral de requisições por IP, para evitar abuso da API como um todo
// (uploads em massa, scraping, etc). Rotas mais sensíveis (login) já têm
// limites próprios e mais restritos.
app.use(
  "/api",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(authMiddleware);

app.use("/api", router);

export default app;
