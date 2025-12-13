-- DropForeignKey (idempotent) - remove FK constraint not in schema
-- createdById is not a relation field in the schema, so drop the constraint if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'Parcel_createdById_fkey'
        AND table_name = 'Parcel'
    ) THEN
        ALTER TABLE "Parcel" DROP CONSTRAINT "Parcel_createdById_fkey";
    END IF;
END $$;

-- AlterEnum (idempotent) - add CANCELLED status for parcels
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'ParcelStatus' AND e.enumlabel = 'CANCELLED'
    ) THEN
        ALTER TYPE "ParcelStatus" ADD VALUE 'CANCELLED';
    END IF;
END $$;

-- AlterTable (idempotent) - add cancellation metadata to parcels
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'Parcel' AND column_name = 'cancelledAt'
    ) THEN
        ALTER TABLE "Parcel" ADD COLUMN "cancelledAt" TIMESTAMP(3);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'Parcel' AND column_name = 'cancellationReason'
    ) THEN
        ALTER TABLE "Parcel" ADD COLUMN "cancellationReason" TEXT;
    END IF;
END $$;

-- CreateTable (idempotent) - track parcel cancellations
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'ParcelCancellationLog'
    ) THEN
        CREATE TABLE "ParcelCancellationLog" (
            "id" TEXT NOT NULL,
            "parcelId" TEXT NOT NULL,
            "cancelledBy" TEXT NOT NULL,
            "reason" TEXT,
            "cancelledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "ParcelCancellationLog_pkey" PRIMARY KEY ("id")
        );
    END IF;
END $$;

-- AlterTable (idempotent) - remove database default from id column if it exists
-- Prisma @default(uuid()) handles UUID generation at application level
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'ParcelCancellationLog'
        AND column_name = 'id'
        AND column_default IS NOT NULL
    ) THEN
        ALTER TABLE "ParcelCancellationLog" ALTER COLUMN "id" DROP DEFAULT;
    END IF;
END $$;

-- AddForeignKey (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'ParcelCancellationLog_parcelId_fkey'
    ) THEN
        ALTER TABLE "ParcelCancellationLog" ADD CONSTRAINT "ParcelCancellationLog_parcelId_fkey"
        FOREIGN KEY ("parcelId") REFERENCES "Parcel"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'ParcelCancellationLog_cancelledBy_fkey'
    ) THEN
        ALTER TABLE "ParcelCancellationLog" ADD CONSTRAINT "ParcelCancellationLog_cancelledBy_fkey"
        FOREIGN KEY ("cancelledBy") REFERENCES "User"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;