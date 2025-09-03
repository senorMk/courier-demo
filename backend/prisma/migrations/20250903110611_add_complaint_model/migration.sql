-- CreateEnum
CREATE TYPE "ComplaintStatus" AS ENUM ('OPEN', 'CLOSED');

-- AlterEnum
ALTER TYPE "ParcelStatus" ADD VALUE 'DAMAGED';

-- CreateTable
CREATE TABLE "Complaint" (
    "id" TEXT NOT NULL,
    "parcelId" TEXT NOT NULL,
    "reason" TEXT,
    "status" "ComplaintStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Complaint_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_parcelId_fkey" FOREIGN KEY ("parcelId") REFERENCES "Parcel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
