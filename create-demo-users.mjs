import { readFileSync } from "fs";
import bcrypt from "./node_modules/.pnpm/bcryptjs@3.0.3/node_modules/bcryptjs/index.js";
import pg from "./node_modules/.pnpm/pg@8.20.0/node_modules/pg/lib/index.js";

const ACCOUNTS = [
  { email: "demo@eleventech.ao", password: "Demo2026!", firstName: "Carlos", lastName: "Mendes", role: "Analista" },
  { email: "admin@eleventech.ao", password: "Admin2026!", firstName: "Ana", lastName: "Ferreira", role: "Administrador" },
];

const envText = readFileSync("artifacts/api-server/.env", "utf8");
const env = {};
for (const line of envText.split(/\r?\n/)) {
  const m = line.match(/^\s*([^#][^=]*)=(.*)$/);
  if (m) env[m[1].trim()] = m[2].trim();
}

const client = new pg.Client({ connectionString: env.DATABASE_URL });
await client.connect();

for (const acc of ACCOUNTS) {
  const hash = await bcrypt.hash(acc.password, 10);
  const result = await client.query(
    `INSERT INTO users (email, password, first_name, last_name, role)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, email, first_name, last_name, role`,
    [acc.email.toLowerCase(), hash, acc.firstName, acc.lastName, acc.role]
  );
  console.log("Criado:", result.rows[0]);
}

await client.end();
