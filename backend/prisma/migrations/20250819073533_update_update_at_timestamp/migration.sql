-- CreateEnum (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CustomerType') THEN
        CREATE TYPE "CustomerType" AS ENUM ('SENDER', 'RECEIVER');
    END IF;
END $$;

-- AlterTable (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'AccessLog' AND column_name = 'createdAt') THEN
        ALTER TABLE "AccessLog" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'AccessLog' AND column_name = 'updatedAt') THEN
        ALTER TABLE "AccessLog" ADD COLUMN "updatedAt" TIMESTAMP(3);
    END IF;
END $$;

-- AlterTable (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'Role' AND column_name = 'createdAt') THEN
        ALTER TABLE "Role" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'Role' AND column_name = 'updatedAt') THEN
        ALTER TABLE "Role" ADD COLUMN "updatedAt" TIMESTAMP(3);
    END IF;
END $$;

-- AlterTable (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'User' AND column_name = 'createdAt') THEN
        ALTER TABLE "User" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'User' AND column_name = 'updatedAt') THEN
        ALTER TABLE "User" ADD COLUMN "updatedAt" TIMESTAMP(3);
    END IF;
END $$;

-- CreateTable (idempotent)
CREATE TABLE IF NOT EXISTS "Office" (
    "id" TEXT NOT NULL,
    "branchCode" TEXT NOT NULL,
    "officeType" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "Office_pkey" PRIMARY KEY ("id")
);

-- CreateTable (idempotent)
CREATE TABLE IF NOT EXISTS "Customer" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "idNumber" TEXT,
    "type" "CustomerType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable (idempotent)
CREATE TABLE IF NOT EXISTS "TrackingCode" (
    "id" TEXT NOT NULL,
    "routeCode" TEXT NOT NULL,
    "destinationCode" TEXT NOT NULL,
    "branchCode" TEXT NOT NULL,
    "parcelNumber" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "TrackingCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable (idempotent)
CREATE TABLE IF NOT EXISTS "Parcel" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "destinationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "Parcel_pkey" PRIMARY KEY ("id")
);

-- CreateTable (idempotent)
CREATE TABLE IF NOT EXISTS "ParcelItem" (
    "id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "pricePerUnit" DOUBLE PRECISION NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "parcelId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "ParcelItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'TrackingCode_parcelNumber_key') THEN
        CREATE UNIQUE INDEX "TrackingCode_parcelNumber_key" ON "TrackingCode"("parcelNumber");
    END IF;
END $$;

-- AddForeignKey (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                   WHERE constraint_name = 'Parcel_customerId_fkey') THEN
        ALTER TABLE "Parcel" ADD CONSTRAINT "Parcel_customerId_fkey"
        FOREIGN KEY ("customerId") REFERENCES "Customer"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                   WHERE constraint_name = 'Parcel_receiverId_fkey') THEN
        ALTER TABLE "Parcel" ADD CONSTRAINT "Parcel_receiverId_fkey"
        FOREIGN KEY ("receiverId") REFERENCES "Customer"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                   WHERE constraint_name = 'Parcel_destinationId_fkey') THEN
        ALTER TABLE "Parcel" ADD CONSTRAINT "Parcel_destinationId_fkey"
        FOREIGN KEY ("destinationId") REFERENCES "Office"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                   WHERE constraint_name = 'ParcelItem_parcelId_fkey') THEN
        ALTER TABLE "ParcelItem" ADD CONSTRAINT "ParcelItem_parcelId_fkey"
        FOREIGN KEY ("parcelId") REFERENCES "Parcel"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;
