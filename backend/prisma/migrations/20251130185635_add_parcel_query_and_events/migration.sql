-- CreateEnum
DO $$ BEGIN
 CREATE TYPE "ParcelQueryType" AS ENUM ('GENERAL', 'DAMAGE', 'ROUTING_ISSUE', 'DELAY', 'MISSING', 'DELIVERY_STATUS', 'PAYMENT', 'OTHER');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
 CREATE TYPE "ParcelQueryStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "ParcelQuery" (
    "id" TEXT NOT NULL,
    "parcelId" TEXT NOT NULL,
    "queryType" "ParcelQueryType" NOT NULL,
    "description" TEXT,
    "status" "ParcelQueryStatus" NOT NULL DEFAULT 'OPEN',
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParcelQuery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ParcelQueryEvent" (
    "id" TEXT NOT NULL,
    "queryId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "fromStatus" "ParcelQueryStatus",
    "toStatus" "ParcelQueryStatus",
    "note" TEXT,
    "performedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ParcelQueryEvent_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
DO $$ BEGIN
 ALTER TABLE "ParcelQuery" ADD CONSTRAINT "ParcelQuery_parcelId_fkey" FOREIGN KEY ("parcelId") REFERENCES "Parcel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
 ALTER TABLE "ParcelQuery" ADD CONSTRAINT "ParcelQuery_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
 ALTER TABLE "ParcelQueryEvent" ADD CONSTRAINT "ParcelQueryEvent_queryId_fkey" FOREIGN KEY ("queryId") REFERENCES "ParcelQuery"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
