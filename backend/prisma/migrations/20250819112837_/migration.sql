/*
  Warnings:

  - A unique constraint covering the columns `[parcelNumber]` on the table `Parcel` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Parcel" ADD COLUMN     "parcelNumber" SERIAL NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Parcel_parcelNumber_key" ON "Parcel"("parcelNumber");
