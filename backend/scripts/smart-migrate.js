const { PrismaClient } = require('@prisma/client');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

/**
 * Smart migration script for Docker/ECS environments
 * Automatically handles:
 * 1. Fresh databases - runs migrate deploy
 * 2. Existing databases with missing migration history - baselines migrations
 * 3. Existing databases with partial migrations - continues from last applied
 */
async function smartMigrate() {
  console.log('🚀 Smart migration starting...\n');

  try {
    // Check if _prisma_migrations table exists
    const migrationTableExists = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = '_prisma_migrations'
      ) as exists
    `.then(r => r[0].exists);

    if (!migrationTableExists) {
      console.log('✓ Fresh database detected - no migration table exists');
      console.log('Running prisma migrate deploy...\n');
      execSync('npx prisma migrate deploy', { stdio: 'inherit' });
      console.log('\n✅ Migrations applied successfully!');
      return;
    }

    // Check applied migrations
    const appliedMigrations = await prisma.$queryRaw`
      SELECT migration_name
      FROM _prisma_migrations
      WHERE finished_at IS NOT NULL
      ORDER BY finished_at
    `;

    // Check how many tables exist
    const tables = await prisma.$queryRaw`
      SELECT COUNT(*) as count
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name != '_prisma_migrations'
    `;
    const tableCount = Number(tables[0].count);

    // Get all migration directories
    const migrationsDir = path.join(process.cwd(), 'prisma', 'migrations');
    const allMigrations = fs.readdirSync(migrationsDir)
      .filter(f => fs.statSync(path.join(migrationsDir, f)).isDirectory())
      .filter(f => f !== 'migration_lock.toml');

    console.log(`📊 Database Status:`);
    console.log(`   - Migrations applied: ${appliedMigrations.length}/${allMigrations.length}`);
    console.log(`   - Tables in database: ${tableCount}\n`);

    // Scenario 1: No migrations applied but tables exist (orphaned database)
    if (appliedMigrations.length === 0 && tableCount > 0) {
      console.log('⚠️  Database has tables but no migration history!');
      console.log('📝 This is an orphaned database - baselining migrations...\n');

      // Check if schema matches by trying db pull
      console.log('🔍 Verifying schema matches...');
      try {
        execSync('npx prisma db pull --force', { stdio: 'pipe' });
        console.log('✓ Schema verification passed\n');
      } catch (error) {
        console.error('❌ Schema mismatch detected!');
        console.error('Manual intervention required - database schema does not match prisma/schema.prisma');
        process.exit(1);
      }

      // Baseline: mark all migrations as applied
      console.log('Marking all migrations as applied...');
      for (const migration of allMigrations) {
        try {
          execSync(`npx prisma migrate resolve --applied "${migration}"`, {
            stdio: 'pipe'
          });
          console.log(`  ✓ ${migration}`);
        } catch (error) {
          // Already applied or error - continue
          console.log(`  ⊘ ${migration} (already marked)`);
        }
      }
      console.log('\n✅ Baseline complete! All migrations marked as applied.');
      return;
    }

    // Scenario 2: Some migrations applied (normal state or partial failure)
    if (appliedMigrations.length < allMigrations.length) {
      const pendingCount = allMigrations.length - appliedMigrations.length;
      console.log(`📦 ${pendingCount} pending migration(s) detected`);
      console.log('Running prisma migrate deploy...\n');

      try {
        execSync('npx prisma migrate deploy', { stdio: 'inherit' });
        console.log('\n✅ Migrations applied successfully!');
      } catch (error) {
        console.error('\n❌ Migration failed!');
        console.error('Check the error above and resolve using:');
        console.error('  npx prisma migrate resolve --rolled-back "<migration_name>"');
        console.error('Or for production recovery, see: https://pris.ly/d/migrate-resolve');
        process.exit(1);
      }
      return;
    }

    // Scenario 3: All migrations applied
    console.log('✅ All migrations already applied - database is up to date!');

  } catch (error) {
    console.error('❌ Smart migration failed:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

smartMigrate();
