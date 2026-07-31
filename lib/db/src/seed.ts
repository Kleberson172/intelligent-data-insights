import bcrypt from "bcryptjs";
import { db } from "./index";
import { usersTable } from "./schema";

async function seed() {
  console.log("A semear utilizadores...");

  const users = [
    {
      email: "demo@eleventech.ao",
      password: await bcrypt.hash("Demo2026!", 10),
      firstName: "Carlos",
      lastName: "Mendes",
      role: "Analista",
    },
    {
      email: "admin@eleventech.ao",
      password: await bcrypt.hash("Admin2026!", 10),
      firstName: "Ana",
      lastName: "Ferreira",
      role: "Administrador",
    },
  ];

  for (const user of users) {
    await db
      .insert(usersTable)
      .values(user)
      .onConflictDoUpdate({
        target: usersTable.email,
        set: {
          password: user.password,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          updatedAt: new Date(),
        },
      });
  }

  console.log(`Base de dados populada com sucesso!`);
  console.log(`  - ${users.length} utilizadores`);
  process.exit(0);
}

seed().catch((err) => {
  console.error("Erro ao semear a base de dados:", err);
  process.exit(1);
});