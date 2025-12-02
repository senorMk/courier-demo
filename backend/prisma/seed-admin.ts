import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

// Load environment variables from ../.env (backend root) before reading them
dotenv.config();

// Required environment variables (no hardcoded fallbacks)
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const ADMIN_ROLE_NAME = process.env.ADMIN_ROLE || 'managing-director';


if (!ADMIN_EMAIL) {
  throw new Error('ADMIN_EMAIL env var is required (set it in backend/.env)');
}
if (!ADMIN_PASSWORD) {
  throw new Error('ADMIN_PASSWORD env var is required (set it in backend/.env)');
}

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding admin user (email: ' + ADMIN_EMAIL + ', role: ' + ADMIN_ROLE_NAME + ')...');
  // Ensure role exists
  let role = await prisma.role.findUnique({ where: { name: ADMIN_ROLE_NAME } });
  if (!role) {
    role = await prisma.role.create({ data: { name: ADMIN_ROLE_NAME } });
    console.log(`Created role '${ADMIN_ROLE_NAME}'`);
  } else {
    console.log(`Role '${ADMIN_ROLE_NAME}' already exists`);
  }

  // Check existing user
  const existing = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
  if (existing) {
    console.log(`Admin user '${ADMIN_EMAIL}' already exists. Skipping.`);
    return;
  }

  const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
  await prisma.user.create({
    data: {
      email: ADMIN_EMAIL,
      password: hashedPassword,
      roleId: role.id,
    },
  });
  console.log(`Admin user '${ADMIN_EMAIL}' created.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
