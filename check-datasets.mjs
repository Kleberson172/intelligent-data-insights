import { readFileSync } from "fs";
import pg from "./node_modules/.pnpm/pg@8.20.0/node_modules/pg/lib/index.js";

const envText = readFileSync("artifacts/api-server/.env", "utf8");
const env = {};
for (const line of envText.split(/\r?\n/)) {
  const m = line.match(/^\s*([^#][^=]*)=(.*)$/);
  if (m) env[m[1].trim()] = m[2].trim();
}

const client = new pg.Client({ connectionString: env.DATABASE_URL });
await client.connect();

const datasets = await client.query(`SELECT id, filename, row_count, uploaded_at FROM datasets ORDER BY uploaded_at DESC;`);
console.log("=== Tabela: datasets ===");
if (datasets.rows.length === 0) {
  console.log("(vazia — nenhum dataset foi salvo ainda)");
} else {
  datasets.rows.forEach(r => console.log(` - ${r.filename} | ${r.row_count} linhas | ${r.uploaded_at}`));
}

const rows = await client.query(`SELECT COUNT(*) AS total FROM dataset_rows;`);
console.log("\n=== Tabela: dataset_rows ===");
console.log(`Total de linhas guardadas: ${rows.rows[0].total}`);

await client.end();
