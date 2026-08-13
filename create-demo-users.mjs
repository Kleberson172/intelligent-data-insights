import { readFileSync } from "fs";
import { randomBytes } from "crypto";
import bcrypt from "./node_modules/.pnpm/bcryptjs@3.0.3/node_modules/bcryptjs/index.js";
import pg from "./node_modules/.pnpm/pg@8.20.0/node_modules/pg/lib/index.js";

// Cria contas de demonstração com senhas geradas aleatoriamente — nunca
// hardcoded, para não expor credenciais reutilizáveis num repositório
// versionado. As senhas são impressas uma única vez no terminal; anota-as.
const ACCOUNTS = [
  { email: "demo@eleventech.ao", firstName: "Carlos", lastName: "Mendes", role: "Analista" },
  { email: "admin@eleventech.ao", firstName: "Ana", lastName: "Ferreira", role: "Administrador" },
];

function generatePassword() {
  return randomBytes(9).toString("base64url"); // ~12 caracteres, aleatório
}

const envText = readFileSync("artifacts/api-server/.env", "utf8");
const env = {};
for (const line of envText.split(/\r?\n/)) {
  const m = line.match(/^\s*([^#][^=]*)=(.*)$/);
  if (m) env[m[1].trim()] = m[2].trim();
}

const client = new pg.Client({ connectionString: env.DATABASE_URL });
await client.connect();

for (const acc of ACCOUNTS) {
  const password = generatePassword();
  const hash = await bcrypt.hash(password, 10);
  const result = await client.query(
    `INSERT INTO users (email, password, first_name, last_name, role)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, email, first_name, last_name, role`,
    [acc.email.toLowerCase(), hash, acc.firstName, acc.lastName, acc.role]
  );
  console.log(`Criado: ${result.rows[0].email} | senha (anota agora, não será mostrada de novo): ${password}`);
}

await client.end();
