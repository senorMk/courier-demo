/*
  Warnings:

  - You are about to drop the column `parcelNumber` on the `TrackingCode` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[parcelId]` on the table `TrackingCode` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `parcelId` to the `TrackingCode` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "TrackingCode_parcelNumber_key";

-- AlterTable
ALTER TABLE "TrackingCode" DROP COLUMN "parcelNumber",
ADD COLUMN     "parcelId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "TrackingCode_parcelId_key" ON "TrackingCode"("parcelId");

-- AddForeignKey
ALTER TABLE "TrackingCode" ADD CONSTRAINT "TrackingCode_parcelId_fkey" FOREIGN KEY ("parcelId") REFERENCES "Parcel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
