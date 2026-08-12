import { readFileSync } from "fs";
import bcrypt from "./node_modules/.pnpm/bcryptjs@3.0.3/node_modules/bcryptjs/index.js";
import pg from "./node_modules/.pnpm/pg@8.20.0/node_modules/pg/lib/index.js";

const EMAIL = "kleberson@eleven.co.ao";
const PASSWORD = "Filomeno1234";
const FIRST_NAME = "Kleberson";
const LAST_NAME = "Filomeno";
const ROLE = "Administrador";

const envText = readFileSync("artifacts/api-server/.env", "utf8");
const env = {};
for (const line of envText.split(/\r?\n/)) {
  const m = line.match(/^\s*([^#][^=]*)=(.*)$/);
  if (m) env[m[1].trim()] = m[2].trim();
}

const hash = await bcrypt.hash(PASSWORD, 10);

const client = new pg.Client({ connectionString: env.DATABASE_URL });
await client.connect();

const result = await client.query(
  `INSERT INTO users (email, password, first_name, last_name, role)
   VALUES ($1, $2, $3, $4, $5)
   RETURNING id, email, first_name, last_name, role`,
  [EMAIL.toLowerCase(), hash, FIRST_NAME, LAST_NAME, ROLE]
);

console.log("Utilizador criado:", result.rows[0]);

await client.end();
