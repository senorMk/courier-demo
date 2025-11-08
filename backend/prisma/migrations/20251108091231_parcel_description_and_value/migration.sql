/*
  Warnings:

  - You are about to drop the `ParcelItem` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `description` to the `Parcel` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "ParcelItem" DROP CONSTRAINT "ParcelItem_parcelId_fkey";

-- AlterTable
ALTER TABLE "Parcel" ADD COLUMN     "description" TEXT,
ADD COLUMN     "value" DOUBLE PRECISION NOT NULL DEFAULT 0;

UPDATE "Parcel" SET "description" = COALESCE("description", 'Legacy parcel');

ALTER TABLE "Parcel" ALTER COLUMN "description" SET NOT NULL;

-- DropTable
DROP TABLE "ParcelItem";
