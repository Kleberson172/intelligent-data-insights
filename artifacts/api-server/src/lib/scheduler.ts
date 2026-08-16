import { db } from "@workspace/db";
import { integrationsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { importIntegrationData } from "./integration-importer";

// Com quanta frequência verificamos se alguma integração está "devida"
// para atualização automática. Não precisa de ser muito preciso — uma
// verificação por minuto é suficiente mesmo para o intervalo mais curto
// disponível na interface (1 hora).
const CHECK_INTERVAL_MS = 60_000;

let timer: ReturnType<typeof setInterval> | undefined;
let running = false; // evita sobreposição se uma importação demorar mais de 1 minuto

async function checkAndRunDueIntegrations(): Promise<void> {
  if (running) return;
  running = true;

  try {
    const rows = await db
      .select()
      .from(integrationsTable)
      .where(eq(integrationsTable.autoRefreshEnabled, true));

    const now = Date.now();

    for (const integration of rows) {
      if (!integration.refreshIntervalMinutes) continue;

      const lastRun = integration.lastImportedAt?.getTime() ?? 0;
      const dueAt = lastRun + integration.refreshIntervalMinutes * 60_000;
      if (now < dueAt) continue;

      console.log(
        `[scheduler] A atualizar integração "${integration.name}" (id=${integration.id}) automaticamente...`,
      );
      const result = await importIntegrationData(integration);
      if (result.success) {
        console.log(`[scheduler] "${integration.name}": ${result.rows} registos importados.`);
      } else {
        console.error(`[scheduler] "${integration.name}" falhou: ${result.error}`);
      }
    }
  } catch (err) {
    console.error("[scheduler] Falha ao verificar integrações devidas:", err);
  } finally {
    running = false;
  }
}

export function startIntegrationScheduler(): void {
  if (timer) return; // já iniciado
  timer = setInterval(checkAndRunDueIntegrations, CHECK_INTERVAL_MS);
  // Corre uma vez logo no arranque, em vez de esperar 1 minuto pela primeira verificação.
  void checkAndRunDueIntegrations();
}

export function stopIntegrationScheduler(): void {
  if (timer) clearInterval(timer);
  timer = undefined;
}
