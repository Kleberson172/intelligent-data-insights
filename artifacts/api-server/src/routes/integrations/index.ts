import { Router } from "express";
import { db } from "@workspace/db";
import { integrationsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { importIntegrationData } from "../../lib/integration-importer";

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
      autoRefreshEnabled?: boolean;
      refreshIntervalMinutes?: number;
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
        autoRefreshEnabled: body.autoRefreshEnabled ?? false,
        refreshIntervalMinutes: body.refreshIntervalMinutes ?? null,
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

    const result = await importIntegrationData(integration);

    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }

    req.log.info({ integrationId: id, rows: result.rows }, "Dados importados de integração");
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to import integration data");
    res.status(500).json({ error: "Erro ao importar dados da integração" });
  }
});

export default router;
