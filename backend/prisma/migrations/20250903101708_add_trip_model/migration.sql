-- CreateEnum (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TripStatus') THEN
        CREATE TYPE "TripStatus" AS ENUM ('PLANNED', 'LOADING', 'IN_TRANSIT', 'COMPLETED');
    END IF;
END $$;

-- AlterTable (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'ScanningSession' AND column_name = 'tripId') THEN
        ALTER TABLE "ScanningSession" ADD COLUMN "tripId" TEXT;
    END IF;
END $$;

-- CreateTable (idempotent)
CREATE TABLE IF NOT EXISTS "Trip" (
    "id" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "officeId" TEXT NOT NULL,
    "driverName" TEXT NOT NULL,
    "truckReg" TEXT NOT NULL,
    "status" "TripStatus" NOT NULL DEFAULT 'PLANNED',
    "plannedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "departedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Trip_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                   WHERE constraint_name = 'ScanningSession_tripId_fkey') THEN
        ALTER TABLE "ScanningSession" ADD CONSTRAINT "ScanningSession_tripId_fkey"
        FOREIGN KEY ("tripId") REFERENCES "Trip"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                   WHERE constraint_name = 'Trip_routeId_fkey') THEN
        ALTER TABLE "Trip" ADD CONSTRAINT "Trip_routeId_fkey"
        FOREIGN KEY ("routeId") REFERENCES "Route"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                   WHERE constraint_name = 'Trip_officeId_fkey') THEN
        ALTER TABLE "Trip" ADD CONSTRAINT "Trip_officeId_fkey"
        FOREIGN KEY ("officeId") REFERENCES "Office"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;
