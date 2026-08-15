import { Router } from "express";
import { db } from "@workspace/db";
import { integrationsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { storeCsvData } from "../../lib/csv-store";

const router = Router();

router.get("/integrations", async (req, res) => {
  try {
    const rows = await db.select().from(integrationsTable).orderBy(integrationsTable.id);
    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "Failed to list integrations");
    res.status(500).json({ error: "Erro ao listar integrações" });
  }
});

router.post("/integrations", async (req, res) => {
  try {
    const body = req.body as {
      name: string;
      type: string;
      host?: string;
      port?: string;
      database?: string;
      username?: string;
      password?: string;
      apiKey?: string;
      apiUrl?: string;
      query?: string;
    };
    const [row] = await db
      .insert(integrationsTable)
      .values({
        name: body.name,
        type: body.type,
        host: body.host ?? null,
        port: body.port ?? null,
        database: body.database ?? null,
        username: body.username ?? null,
        password: body.password ?? null,
        apiKey: body.apiKey ?? null,
        apiUrl: body.apiUrl ?? null,
        query: body.query ?? null,
        isActive: false,
      })
      .returning();
    res.status(201).json(row);
  } catch (err) {
    req.log.error({ err }, "Failed to create integration");
    res.status(500).json({ error: "Erro ao criar integração" });
  }
});

router.put("/integrations/:id", async (req, res) => {
  try {
    const id = Number(req.params["id"]);
    const body = req.body as Partial<typeof integrationsTable.$inferInsert>;
    const [row] = await db
      .update(integrationsTable)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(integrationsTable.id, id))
      .returning();
    if (!row) {
      res.status(404).json({ error: "Integração não encontrada" });
      return;
    }
    res.json(row);
  } catch (err) {
    req.log.error({ err }, "Failed to update integration");
    res.status(500).json({ error: "Erro ao atualizar integração" });
  }
});

router.delete("/integrations/:id", async (req, res) => {
  try {
    const id = Number(req.params["id"]);
    await db.delete(integrationsTable).where(eq(integrationsTable.id, id));
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to delete integration");
    res.status(500).json({ error: "Erro ao eliminar integração" });
  }
});

router.post("/integrations/:id/test", async (req, res) => {
  try {
    const id = Number(req.params["id"]);
    const [integration] = await db
      .select()
      .from(integrationsTable)
      .where(eq(integrationsTable.id, id));

    if (!integration) {
      res.status(404).json({ error: "Integração não encontrada" });
      return;
    }

    let success = false;
    let message = "";

    if (integration.type === "postgresql") {
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
        await client.query("SELECT 1");
        await client.end();
        success = true;
        message = "Conexão estabelecida com sucesso!";
      } catch (e) {
        message = e instanceof Error ? e.message : "Falha na conexão";
      }
    } else if (integration.type === "api") {
      const url = integration.apiUrl;
      if (!url) {
        message = "URL da API não configurada";
      } else {
        try {
          const headers: Record<string, string> = {};
          if (integration.apiKey) headers["Authorization"] = `Bearer ${integration.apiKey}`;
          const resp = await fetch(url, { method: "GET", headers, signal: AbortSignal.timeout(5000) });
          success = resp.ok;
          message = resp.ok ? `API respondeu: ${resp.status} ${resp.statusText}` : `Erro: ${resp.status} ${resp.statusText}`;
        } catch (e) {
          message = e instanceof Error ? e.message : "Falha na requisição";
        }
      }
    } else {
      success = true;
      message = "Tipo de conexão verificado";
    }

    await db
      .update(integrationsTable)
      .set({ isActive: success, lastTestedAt: new Date(), updatedAt: new Date() })
      .where(eq(integrationsTable.id, id));

    res.json({ success, message });
  } catch (err) {
    req.log.error({ err }, "Failed to test integration");
    res.status(500).json({ error: "Erro ao testar integração" });
  }
});

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

router.post("/integrations/:id/import", async (req, res) => {
  try {
    const id = Number(req.params["id"]);
    const [integration] = await db
      .select()
      .from(integrationsTable)
      .where(eq(integrationsTable.id, id));

    if (!integration) {
      res.status(404).json({ error: "Integração não encontrada" });
      return;
    }

    let headers: string[] = [];
    let records: Record<string, string>[] = [];

    if (integration.type === "postgresql") {
      if (!integration.query?.trim()) {
        res.status(400).json({
          error: "Esta conexão não tem uma consulta SQL configurada. Edite a conexão e defina uma consulta (ex: SELECT * FROM vendas).",
        });
        return;
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
          res.status(400).json({ error: "A consulta não devolveu nenhuma linha." });
          return;
        }

        headers = result.fields.map((f) => f.name);
        records = result.rows.map((row) => {
          const record: Record<string, string> = {};
          for (const h of headers) record[h] = toStringValue(row[h]);
          return record;
        });
      } catch (e) {
        try { await client.end(); } catch { /* já pode estar fechada */ }
        res.status(400).json({ error: e instanceof Error ? e.message : "Falha ao ligar à base de dados" });
        return;
      }
    } else if (integration.type === "api") {
      if (!integration.apiUrl) {
        res.status(400).json({ error: "Esta conexão não tem uma URL de API configurada." });
        return;
      }

      try {
        const headersInit: Record<string, string> = {};
        if (integration.apiKey) headersInit["Authorization"] = `Bearer ${integration.apiKey}`;
        const resp = await fetch(integration.apiUrl, { method: "GET", headers: headersInit, signal: AbortSignal.timeout(10_000) });

        if (!resp.ok) {
          res.status(400).json({ error: `A API respondeu com erro: ${resp.status} ${resp.statusText}` });
          return;
        }

        const payload = await resp.json();
        const found = findRecordsArray(payload);

        if (!found || found.length === 0) {
          res.status(400).json({
            error: "Não foi possível encontrar uma lista de registos na resposta da API. É esperado um array de objetos (diretamente ou dentro de um campo como \"data\" ou \"results\").",
          });
          return;
        }

        headers = Object.keys(found[0]);
        records = found.map((item) => {
          const record: Record<string, string> = {};
          for (const h of headers) record[h] = toStringValue(item[h]);
          return record;
        });
      } catch (e) {
        res.status(400).json({ error: e instanceof Error ? e.message : "Falha ao contactar a API" });
        return;
      }
    } else {
      res.status(400).json({ error: `Importação não suportada para o tipo "${integration.type}".` });
      return;
    }

    await storeCsvData(integration.name, headers, records);

    await db
      .update(integrationsTable)
      .set({ isActive: true, lastImportedAt: new Date(), updatedAt: new Date() })
      .where(eq(integrationsTable.id, id));

    req.log.info({ integrationId: id, rows: records.length }, "Dados importados de integração");

    res.json({ success: true, rows: records.length, columns: headers });
  } catch (err) {
    req.log.error({ err }, "Failed to import integration data");
    res.status(500).json({ error: "Erro ao importar dados da integração" });
  }
});

export default router;
