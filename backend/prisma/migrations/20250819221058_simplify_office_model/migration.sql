-- AlterEnum (idempotent - checks if enum values exist)
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum e
                   JOIN pg_type t ON e.enumtypid = t.oid
                   WHERE t.typname = 'OfficeType' AND e.enumlabel = 'DISPATCH') THEN
        ALTER TYPE "OfficeType" ADD VALUE 'DISPATCH';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum e
                   JOIN pg_type t ON e.enumtypid = t.oid
                   WHERE t.typname = 'OfficeType' AND e.enumlabel = 'TRANSIT') THEN
        ALTER TYPE "OfficeType" ADD VALUE 'TRANSIT';
    END IF;
END $$;

-- DropForeignKey
ALTER TABLE "Office" DROP CONSTRAINT "Office_routeId_fkey";
