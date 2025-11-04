#!/bin/bash
set -e

# Script to baseline migrations in production
# Use this when your database schema is correct but migration history is missing

echo "🔍 Checking database state..."

# Check if database has tables
TABLE_COUNT=$(node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.\$queryRaw\`
  SELECT COUNT(*) as count
  FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name != '_prisma_migrations'
\`.then(r => console.log(r[0].count))
  .finally(() => prisma.\$disconnect());
")

if [ "$TABLE_COUNT" -gt "0" ]; then
  echo "✓ Found $TABLE_COUNT tables in database"
  echo "📝 Database appears initialized - proceeding with baseline"

  # Get list of all migrations
  MIGRATIONS=$(ls -1 prisma/migrations | grep -v "migration_lock")

  echo "📦 Found $(echo "$MIGRATIONS" | wc -l) migrations to baseline"

  # Mark each migration as applied
  for migration in $MIGRATIONS; do
    echo "  Marking $migration as applied..."
    npx prisma migrate resolve --applied "$migration" 2>&1 | grep -q "marked as applied" && echo "    ✓" || echo "    Already applied"
  done

  echo "✅ Baseline complete! All migrations marked as applied."
else
  echo "⚠️  Database appears empty - run 'npx prisma migrate deploy' instead"
  exit 1
fi
