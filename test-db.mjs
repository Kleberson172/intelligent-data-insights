import { readFileSync } from "fs";
import pg from "./node_modules/.pnpm/pg@8.20.0/node_modules/pg/lib/index.js";

const envText = readFileSync("artifacts/api-server/.env", "utf8");
const env = {};
for (const line of envText.split(/\r?\n/)) {
  const m = line.match(/^\s*([^#][^=]*)=(.*)$/);
  if (m) env[m[1].trim()] = m[2].trim();
}

console.log("DATABASE_URL usada:", env.DATABASE_URL);

const client = new pg.Client({ connectionString: env.DATABASE_URL });
try {
  await client.connect();
  console.log("Conexao aberta com sucesso.");
  const res = await client.query("select sid, sess, expire from sessions where sid = $1", ["teste"]);
  console.log("Query OK:", res.rows);
} catch (err) {
  console.error("ERRO COMPLETO:");
  console.error(err);
} finally {
  await client.end();
}
