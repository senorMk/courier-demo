import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

// Override via env if needed
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@pcs-zambia.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '#udiURvxQt1KYWEs';
const ADMIN_ROLE_NAME = process.env.ADMIN_ROLE || 'managing-director';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding admin user...');
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
