/*
  Warnings:

  - Changed the type of `officeType` on the `Office` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum (idempotent - checks if exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OfficeType') THEN
        CREATE TYPE "OfficeType" AS ENUM ('SENDING', 'RECEIVING');
    END IF;
END $$;

-- AlterTable (idempotent - checks if column exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'Office' AND column_name = 'officeType') THEN
        ALTER TABLE "Office" DROP COLUMN "officeType";
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'Office' AND column_name = 'officeType') THEN
        ALTER TABLE "Office" ADD COLUMN "officeType" "OfficeType" NOT NULL;
    END IF;
END $$;
