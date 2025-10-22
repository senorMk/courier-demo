-- CreateEnum
CREATE TYPE "BayType" AS ENUM ('SENDING', 'RECEIVING', 'DISPATCH');

-- AlterTable
ALTER TABLE "ScanningSession" ADD COLUMN     "bayId" TEXT;

-- CreateTable
CREATE TABLE "Bay" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "bayType" "BayType" NOT NULL,
    "officeId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bay_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Bay_officeId_bayType_key" ON "Bay"("officeId", "bayType");

-- AddForeignKey
ALTER TABLE "Bay" ADD CONSTRAINT "Bay_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "Office"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScanningSession" ADD CONSTRAINT "ScanningSession_bayId_fkey" FOREIGN KEY ("bayId") REFERENCES "Bay"("id") ON DELETE SET NULL ON UPDATE CASCADE;
