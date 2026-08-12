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

const result = await client.query(`
  SELECT table_name FROM information_schema.tables
  WHERE table_schema = 'public'
  ORDER BY table_name;
`);

console.log("Tabelas encontradas:");
result.rows.forEach(r => console.log(" -", r.table_name));

await client.end();
