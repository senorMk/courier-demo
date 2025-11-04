-- CreateEnum (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BayType') THEN
        CREATE TYPE "BayType" AS ENUM ('SENDING', 'RECEIVING', 'DISPATCH');
    END IF;
END $$;

-- AlterTable (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'ScanningSession' AND column_name = 'bayId') THEN
        ALTER TABLE "ScanningSession" ADD COLUMN "bayId" TEXT;
    END IF;
END $$;

-- CreateTable (idempotent)
CREATE TABLE IF NOT EXISTS "Bay" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "bayType" "BayType" NOT NULL,
    "officeId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bay_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'Bay_officeId_bayType_key') THEN
        CREATE UNIQUE INDEX "Bay_officeId_bayType_key" ON "Bay"("officeId", "bayType");
    END IF;
END $$;

-- AddForeignKey (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                   WHERE constraint_name = 'Bay_officeId_fkey') THEN
        ALTER TABLE "Bay" ADD CONSTRAINT "Bay_officeId_fkey"
        FOREIGN KEY ("officeId") REFERENCES "Office"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                   WHERE constraint_name = 'ScanningSession_bayId_fkey') THEN
        ALTER TABLE "ScanningSession" ADD CONSTRAINT "ScanningSession_bayId_fkey"
        FOREIGN KEY ("bayId") REFERENCES "Bay"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
