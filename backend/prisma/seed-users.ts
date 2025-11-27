import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import { DEFAULT_BACKOFFICE_ROLE_NAMES } from '../src/users/role.constants';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();

// Default password for all seeded users (should be changed after first login)
const DEFAULT_PASSWORD = 'ChangeMe123!';

// User data for each role
const ROLE_USERS = {
  'managing-director': {
    email: 'director@platinum.co.zm',
    firstName: 'Director',
    lastName: 'Platinum',
  },
  'operations-officer': {
    email: 'operations@platinum.co.zm',
    firstName: 'Operations',
    lastName: 'Officer',
  },
  'dispatcher': {
    email: 'dispatch@platinum.co.zm',
    firstName: 'Dispatch',
    lastName: 'Manager',
  },
  'supervisor': {
    email: 'supervisor@platinum.co.zm',
    firstName: 'Team',
    lastName: 'Supervisor',
  },
  'cashier': {
    email: 'cashier@platinum.co.zm',
    firstName: 'Cash',
    lastName: 'Manager',
  },
  'receiver': {
    email: 'receiver@platinum.co.zm',
    firstName: 'Parcel',
    lastName: 'Receiver',
  },
  'sorter': {
    email: 'sorter@platinum.co.zm',
    firstName: 'Parcel',
    lastName: 'Sorter',
  },
  'driver': {
    email: 'driver@platinum.co.zm',
    firstName: 'Delivery',
    lastName: 'Driver',
  },
  'assistant-driver': {
    email: 'assistant@platinum.co.zm',
    firstName: 'Assistant',
    lastName: 'Driver',
  },
  'customer-service-agent': {
    email: 'support@platinum.co.zm',
    firstName: 'Customer',
    lastName: 'Support',
  },
  'customer-service-director': {
    email: 'csdirector@platinum.co.zm',
    firstName: 'Customer Service',
    lastName: 'Director',
  },
};

async function main() {
  console.log('Starting to seed users for all roles...');
  
  // Get all roles from the database
  const roles = await prisma.role.findMany({
    where: {
      name: {
        in: [...DEFAULT_BACKOFFICE_ROLE_NAMES]
      }
    }
  });

  if (roles.length === 0) {
    console.error('No roles found in the database. Please run the role seeder first.');
    return;
  }

  let createdCount = 0;
  const skippedEmails: string[] = [];

  // Create a user for each role
  for (const role of roles) {
    const userData = ROLE_USERS[role.name as keyof typeof ROLE_USERS];
    
    if (!userData) {
      console.warn(`No user data defined for role: ${role.name}`);
      continue;
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: userData.email }
    });

    if (existingUser) {
      skippedEmails.push(userData.email);
      console.log(`User ${userData.email} already exists. Skipping...`);
      continue;
    }

    // Hash the default password
    const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);

    // Create the user
    await prisma.user.create({
      data: {
        email: userData.email,
        password: hashedPassword,
        firstName: userData.firstName,
        lastName: userData.lastName,
        roleId: role.id,
      },
    });

    console.log(`Created user ${userData.email} with role ${role.name}`);
    createdCount++;
  }

  console.log('\nSeeding completed!');
  console.log(`Created ${createdCount} new users.`);
  
  if (skippedEmails.length > 0) {
    console.log(`\nSkipped ${skippedEmails.length} existing users:`);
    skippedEmails.forEach(email => console.log(`- ${email}`));
  }

  console.log('\nDefault password for all users: ' + DEFAULT_PASSWORD);
  console.log('IMPORTANT: Change these passwords after first login!');
}

main()
  .catch((e) => {
    console.error('Error seeding users:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
