import { db } from "@workspace/db";
import { integrationsTable } from "@workspace/db/schema";
import { eq, type InferSelectModel } from "drizzle-orm";
import { storeCsvData } from "./csv-store";

type Integration = InferSelectModel<typeof integrationsTable>;

export type ImportResult =
  | { success: true; rows: number; columns: string[] }
  | { success: false; error: string };

// Converte qualquer valor vindo do Postgres ou de uma API (número, data,
// booleano, null, etc.) para texto, no mesmo formato que o resto da app
// espera (igual ao que sai de um ficheiro CSV).
function toStringValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

// Uma resposta de API pode ser um array diretamente, ou um objeto que
// contém o array algures lá dentro (ex: {"data": [...]} ou
// {"results": [...]}), um padrão muito comum. Tentamos encontrar o
// array de registos de forma razoável antes de desistir.
function findRecordsArray(payload: unknown): Record<string, unknown>[] | null {
  if (Array.isArray(payload)) {
    return payload.every((item) => typeof item === "object" && item !== null)
      ? (payload as Record<string, unknown>[])
      : null;
  }
  if (typeof payload === "object" && payload !== null) {
    for (const value of Object.values(payload)) {
      const found = findRecordsArray(value);
      if (found && found.length > 0) return found;
    }
  }
  return null;
}

async function importFromPostgres(integration: Integration): Promise<ImportResult> {
  if (!integration.query?.trim()) {
    return {
      success: false,
      error: "Esta conexão não tem uma consulta SQL configurada. Edite a conexão e defina uma consulta (ex: SELECT * FROM vendas).",
    };
  }

  const { Client } = await import("pg");
  const client = new Client({
    host: integration.host ?? undefined,
    port: integration.port ? Number(integration.port) : undefined,
    database: integration.database ?? undefined,
    user: integration.username ?? undefined,
    password: integration.password ?? undefined,
    connectionTimeoutMillis: 5000,
  });

  try {
    await client.connect();
    const result = await client.query(integration.query);
    await client.end();

    if (result.rows.length === 0) {
      return { success: false, error: "A consulta não devolveu nenhuma linha." };
    }

    const headers = result.fields.map((f) => f.name);
    const records = result.rows.map((row) => {
      const record: Record<string, string> = {};
      for (const h of headers) record[h] = toStringValue(row[h]);
      return record;
    });

    return { success: true, rows: records.length, columns: headers, records } as ImportResult & { records: Record<string, string>[] };
  } catch (e) {
    try { await client.end(); } catch { /* já pode estar fechada */ }
    return { success: false, error: e instanceof Error ? e.message : "Falha ao ligar à base de dados" };
  }
}

async function importFromApi(integration: Integration): Promise<ImportResult> {
  if (!integration.apiUrl) {
    return { success: false, error: "Esta conexão não tem uma URL de API configurada." };
  }

  try {
    const headersInit: Record<string, string> = {};
    if (integration.apiKey) headersInit["Authorization"] = `Bearer ${integration.apiKey}`;
    const resp = await fetch(integration.apiUrl, { method: "GET", headers: headersInit, signal: AbortSignal.timeout(10_000) });

    if (!resp.ok) {
      return { success: false, error: `A API respondeu com erro: ${resp.status} ${resp.statusText}` };
    }

    const payload = await resp.json();
    const found = findRecordsArray(payload);

    if (!found || found.length === 0) {
      return {
        success: false,
        error: "Não foi possível encontrar uma lista de registos na resposta da API. É esperado um array de objetos (diretamente ou dentro de um campo como \"data\" ou \"results\").",
      };
    }

    const headers = Object.keys(found[0]);
    const records = found.map((item) => {
      const record: Record<string, string> = {};
      for (const h of headers) record[h] = toStringValue(item[h]);
      return record;
    });

    return { success: true, rows: records.length, columns: headers, records } as ImportResult & { records: Record<string, string>[] };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Falha ao contactar a API" };
  }
}

// Importa os dados de uma integração (PostgreSQL ou API) e alimenta o
// dataset ativo da app (dashboard, predições, anomalias, Agente de IA) —
// exatamente o que o botão "Importar" manual faz, reutilizado aqui para
// também poder ser chamado pelo agendador automático.
export async function importIntegrationData(integration: Integration): Promise<ImportResult> {
  let result: ImportResult & { records?: Record<string, string>[] };

  if (integration.type === "postgresql") {
    result = await importFromPostgres(integration);
  } else if (integration.type === "api") {
    result = await importFromApi(integration);
  } else {
    return { success: false, error: `Importação não suportada para o tipo "${integration.type}".` };
  }

  if (!result.success) return result;

  await storeCsvData(integration.name, result.columns, result.records ?? []);

  await db
    .update(integrationsTable)
    .set({ isActive: true, lastImportedAt: new Date(), updatedAt: new Date() })
    .where(eq(integrationsTable.id, integration.id));

  return { success: true, rows: result.rows, columns: result.columns };
}
