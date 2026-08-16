import { pgTable, serial, text, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const integrationsTable = pgTable("integrations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  host: text("host"),
  port: text("port"),
  database: text("database"),
  username: text("username"),
  password: text("password"),
  apiKey: text("api_key"),
  apiUrl: text("api_url"),
  // Consulta SQL usada para importar dados (tipo "postgresql"). Deve
  // devolver linhas que representem os dados de negócio a analisar
  // (ex: "SELECT * FROM vendas LIMIT 5000").
  query: text("query"),
  // Atualização automática: se ativa, o servidor importa os dados desta
  // conexão sozinho, de X em X minutos, sem precisar de clique manual.
  autoRefreshEnabled: boolean("auto_refresh_enabled").notNull().default(false),
  refreshIntervalMinutes: integer("refresh_interval_minutes"),
  isActive: boolean("is_active").notNull().default(false),
  lastTestedAt: timestamp("last_tested_at"),
  lastImportedAt: timestamp("last_imported_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertIntegrationSchema = createInsertSchema(integrationsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertIntegration = z.infer<typeof insertIntegrationSchema>;
export type Integration = typeof integrationsTable.$inferSelect;
