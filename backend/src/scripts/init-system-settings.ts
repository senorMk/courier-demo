/**
 * Script to initialize system settings with default values
 * Run with: npx tsx src/scripts/init-system-settings.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function initializeSystemSettings() {
  console.log('Initializing system settings...');

  try {
    // Set default uncollected threshold to 7 days
    await prisma.systemSettings.upsert({
      where: { key: 'uncollected_threshold_days' },
      create: {
        key: 'uncollected_threshold_days',
        value: '7',
        description: 'Number of days after which an uncollected parcel is considered overdue',
      },
      update: {
        value: '7',
        description: 'Number of days after which an uncollected parcel is considered overdue',
      },
    });

    console.log('✓ System settings initialized successfully');
    console.log('  - uncollected_threshold_days: 7');
  } catch (error) {
    console.error('Error initializing system settings:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

initializeSystemSettings();
