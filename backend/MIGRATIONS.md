# Database Migrations Guide

This document explains how database migrations work in different environments for the PCS Zambia backend.

## Overview

The project uses **Prisma** for database migrations with a custom **smart migration system** that automatically handles various database states.

## Migration Strategies

### Development (Local)

**Reset and rebuild:**
```bash
npx prisma migrate reset  # ⚠️ DESTRUCTIVE - drops all data
npx tsx prisma/seed-admin.ts
```

**Create new migrations:**
```bash
# 1. Edit prisma/schema.prisma
# 2. Generate migration
npx prisma migrate dev --name descriptive_name
# 3. Commit the new migration file to git
```

### Production/Docker/ECS (Automated)

The container automatically runs migrations on startup using the **smart migration script**.

**What happens when container starts:**
```bash
npm run deploy
# Runs: npm install && migrate:smart && seed:admin && start:prod
```

## Smart Migration System

The smart migration script ([scripts/smart-migrate.js](scripts/smart-migrate.js)) automatically detects and handles three scenarios:

### Scenario 1: Fresh Database
- **Detection:** No `_prisma_migrations` table exists
- **Action:** Runs `npx prisma migrate deploy`
- **Result:** All migrations applied in order

### Scenario 2: Orphaned Database
- **Detection:** Tables exist but migration history is empty/missing
- **Action:**
  1. Verifies schema matches `schema.prisma`
  2. Baselines all migrations (marks them as applied)
- **Result:** Migration history restored without re-running migrations
- **Use case:** Database restored from backup, manual schema changes, migration history lost

### Scenario 3: Partial Migrations
- **Detection:** Some but not all migrations applied
- **Action:** Runs `npx prisma migrate deploy` to apply pending migrations
- **Result:** Database brought up to date
- **Use case:** Normal deployment with new migrations

### Scenario 4: Up-to-Date Database
- **Detection:** All migrations already applied
- **Action:** None
- **Result:** Exits successfully
- **Use case:** Container restart, no new migrations

## Idempotent Migrations

Key migration files have been made **idempotent** (safe to run multiple times):

- `20250811190004_add_email_to_user` - User and Role enums
- `20250819073533_update_update_at_timestamp` - CustomerType enum
- `20250819170310_update_office_schema` - OfficeType enum
- `20250819221058_simplify_office_model` - OfficeType enum value additions (DISPATCH, TRANSIT)
- `20250901203038_add_parcel_size_and_payment_options` - ParcelSize, PaymentMethod enums
- `20250903101708_add_trip_model` - TripStatus enum
- `20250903104551_add_parcel_status` - ParcelStatus enum
- `20250903110611_add_complaint_model` - ComplaintStatus enum, ParcelStatus DAMAGED value
- `20250914055101_add_complaint_box_status` - ParcelStatus COMPLAINT_BOX value
- `20251022162856_add_bay_management` - BayType enum
- `20251103182503_add_sorting_bay_type` - BayType SORTING value

**Idempotency techniques used:**
```sql
-- Check before creating enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'EnumName') THEN
        CREATE TYPE "EnumName" AS ENUM ('VALUE1', 'VALUE2');
    END IF;
END $$;

-- Check before adding enum value
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum e
                   JOIN pg_type t ON e.enumtypid = t.oid
                   WHERE t.typname = 'EnumName' AND e.enumlabel = 'NEW_VALUE') THEN
        ALTER TYPE "EnumName" ADD VALUE 'NEW_VALUE';
    END IF;
END $$;

-- Check before creating table
CREATE TABLE IF NOT EXISTS "TableName" (...);

-- Check before adding column
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'TableName' AND column_name = 'column_name') THEN
        ALTER TABLE "TableName" ADD COLUMN "column_name" TYPE;
    END IF;
END $$;
```

## Handling Migration Failures in Production

If a migration fails in production, use these recovery steps:

### 1. Check Migration Status
```bash
# SSH into container
docker exec -it <container-name> sh

# Check status
npx prisma migrate status
```

### 2. Resolve Failed Migration

**If migration is in progress but failed:**
```bash
# Mark as rolled back (not applied)
npx prisma migrate resolve --rolled-back "migration_name"

# Try again
npm run migrate:smart
```

**If migration applied but marked as failed:**
```bash
# Mark as applied (skip re-running)
npx prisma migrate resolve --applied "migration_name"
```

### 3. Schema Drift Detection
```bash
# Check if database schema differs from schema.prisma
npx prisma migrate diff \
  --from-schema-datamodel prisma/schema.prisma \
  --to-schema-datasource "DATABASE_URL" \
  --script
```

## Environment Variables

Required for migrations:

```env
DATABASE_URL=postgresql://user:pass@host:5432/dbname
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=secure_password
ADMIN_ROLE=managing-director
```

## Files

- `prisma/schema.prisma` - Database schema definition
- `prisma/migrations/` - Migration history (committed to git)
- `prisma/seed-admin.ts` - Admin user seeding script
- `scripts/smart-migrate.js` - Smart migration orchestration
- `scripts/baseline-migrations.sh` - Manual baseline utility

## Best Practices

1. **Never edit applied migrations** - Create a new migration instead
2. **Always test migrations locally** before deploying
3. **Commit migrations to git** immediately after creating
4. **Use descriptive migration names** for easy identification
5. **Back up production database** before major schema changes
6. **Monitor migration logs** during deployments

## Troubleshooting

### "Type already exists" Error
- **Cause:** Database has objects but missing migration history
- **Solution:** Smart migration script will auto-baseline

### "Column does not exist" Error
- **Cause:** Schema drift or manual database changes
- **Solution:** Run `npx prisma db pull` to sync schema, then create new migration

### "Migration failed to apply"
- **Cause:** Migration conflict, constraint violation, or data issue
- **Solution:** Check error details, resolve with `prisma migrate resolve`

### Container keeps restarting
- **Cause:** Migration failure causing deploy script to exit
- **Solution:** Check logs, fix migration, redeploy

## CI/CD Integration

The Dockerfile already includes migrations in the deployment flow:

```dockerfile
CMD ["npm", "run", "deploy"]
# Runs: migrate:smart → seed:admin → start:prod
```

**No manual steps required** - migrations run automatically on container start.

## Additional Resources

- [Prisma Migrations Docs](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [Production Troubleshooting](https://www.prisma.io/docs/guides/migrate/production-troubleshooting)
- [Schema Prototyping](https://www.prisma.io/docs/guides/migrate/prototyping-schema-db-push)
