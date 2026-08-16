import app from "./app";
import { logger } from "./lib/logger";
import { hydrateCsvStoreFromDb } from "./lib/csv-store";
import { startIntegrationScheduler } from "./lib/scheduler";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// Recarrega o último CSV carregado (se houver) antes de aceitar requisições,
// para que o dataset sobreviva a reinícios do servidor.
await hydrateCsvStoreFromDb();

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
  startIntegrationScheduler();
});
