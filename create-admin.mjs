import { readFileSync } from "fs";
import bcrypt from "./node_modules/.pnpm/bcryptjs@3.0.3/node_modules/bcryptjs/index.js";
import pg from "./node_modules/.pnpm/pg@8.20.0/node_modules/pg/lib/index.js";

// Uso: ADMIN_EMAIL=... ADMIN_PASSWORD=... ADMIN_FIRST_NAME=... ADMIN_LAST_NAME=... node create-admin.mjs
// Nunca coloques a senha diretamente neste ficheiro — ele é versionado no Git.
const EMAIL = process.env.ADMIN_EMAIL;
const PASSWORD = process.env.ADMIN_PASSWORD;
const FIRST_NAME = process.env.ADMIN_FIRST_NAME ?? "Admin";
const LAST_NAME = process.env.ADMIN_LAST_NAME ?? "";
const ROLE = "Administrador";

if (!EMAIL || !PASSWORD) {
  console.error("Erro: define ADMIN_EMAIL e ADMIN_PASSWORD como variaveis de ambiente antes de correr este script.");
  console.error("Exemplo (PowerShell):");
  console.error('  $env:ADMIN_EMAIL="teu@email.com"; $env:ADMIN_PASSWORD="umaSenhaForte"; node create-admin.mjs');
  process.exit(1);
}

if (PASSWORD.length < 8) {
  console.error("Erro: a senha deve ter pelo menos 8 caracteres.");
  process.exit(1);
}

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
