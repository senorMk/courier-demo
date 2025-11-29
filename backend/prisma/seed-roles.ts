import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";
import { DEFAULT_BACKOFFICE_ROLE_NAMES } from "../src/users/role.constants";

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding staff roles...");

  const createManyResult = await prisma.role.createMany({
    data: DEFAULT_BACKOFFICE_ROLE_NAMES.map((name) => ({ name })),
    skipDuplicates: true,
  });

  const total = await prisma.role.count();

  console.log(
    `Ensured ${DEFAULT_BACKOFFICE_ROLE_NAMES.length} predefined roles exist. ` +
      `${createManyResult.count} new role(s) inserted. Total roles in database: ${total}.`
  );
}

main()
  .catch((error) => {
    console.error("Failed to seed roles", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
