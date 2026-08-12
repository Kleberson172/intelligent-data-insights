import { sql } from "drizzle-orm";
import { integer, jsonb, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./auth";

// Um dataset = um ficheiro CSV carregado por um utilizador
export const datasetsTable = pgTable("datasets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => usersTable.id),
  filename: varchar("filename").notNull(),
  // Guarda os nomes das colunas do CSV, na ordem original (ex: ["data", "produto", "valor", "provincia"])
  columns: jsonb("columns").notNull().$type<string[]>(),
  rowCount: integer("row_count").notNull().default(0),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow(),
});

// Cada linha do CSV vira uma linha aqui, guardada como JSON flexível
// (não importa quais colunas o CSV trouxer — funciona para qualquer estrutura)
export const datasetRowsTable = pgTable("dataset_rows", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  datasetId: varchar("dataset_id")
    .notNull()
    .references(() => datasetsTable.id, { onDelete: "cascade" }),
  rowIndex: integer("row_index").notNull(),
  // Ex: { "data": "2026-01-15", "produto": "Painel Solar", "valor": "45000", "provincia": "Luanda" }
  data: jsonb("data").notNull().$type<Record<string, string>>(),
});

export const insertDatasetSchema = createInsertSchema(datasetsTable).omit({ id: true, uploadedAt: true });
export type InsertDataset = z.infer<typeof insertDatasetSchema>;
export type Dataset = typeof datasetsTable.$inferSelect;

export const insertDatasetRowSchema = createInsertSchema(datasetRowsTable).omit({ id: true });
export type InsertDatasetRow = z.infer<typeof insertDatasetRowSchema>;
export type DatasetRow = typeof datasetRowsTable.$inferSelect;
