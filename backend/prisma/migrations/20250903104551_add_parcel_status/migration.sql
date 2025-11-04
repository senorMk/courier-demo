-- CreateEnum (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ParcelStatus') THEN
        CREATE TYPE "ParcelStatus" AS ENUM ('PENDING', 'READY_FOR_COLLECTION', 'COLLECTED');
    END IF;
END $$;

-- AlterTable (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'Parcel' AND column_name = 'status') THEN
        ALTER TABLE "Parcel" ADD COLUMN "status" "ParcelStatus" NOT NULL DEFAULT 'PENDING';
    END IF;
END $$;
