import { readFileSync } from "fs";

const envText = readFileSync(".env", "utf8");
for (const line of envText.split(/\r?\n/)) {
  const m = line.match(/^\s*([^#][^=]*)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim();
}

const { db, sessionsTable } = await import("@workspace/db");
const { eq } = await import("drizzle-orm");

try {
  const rows = await db.select().from(sessionsTable).where(eq(sessionsTable.sid, "teste"));
  console.log("OK:", rows);
} catch (err) {
  console.error("ERRO COMPLETO:");
  console.error(err);
  if (err && err.cause) {
    console.error("CAUSE:", err.cause);
  }
}
process.exit(0);
