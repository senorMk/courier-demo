-- CreateEnum (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ComplaintStatus') THEN
        CREATE TYPE "ComplaintStatus" AS ENUM ('OPEN', 'CLOSED');
    END IF;
END $$;

-- AlterEnum (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum e
                   JOIN pg_type t ON e.enumtypid = t.oid
                   WHERE t.typname = 'ParcelStatus' AND e.enumlabel = 'DAMAGED') THEN
        ALTER TYPE "ParcelStatus" ADD VALUE 'DAMAGED';
    END IF;
END $$;

-- CreateTable (idempotent)
CREATE TABLE IF NOT EXISTS "Complaint" (
    "id" TEXT NOT NULL,
    "parcelId" TEXT NOT NULL,
    "reason" TEXT,
    "status" "ComplaintStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Complaint_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                   WHERE constraint_name = 'Complaint_parcelId_fkey') THEN
        ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_parcelId_fkey"
        FOREIGN KEY ("parcelId") REFERENCES "Parcel"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;
