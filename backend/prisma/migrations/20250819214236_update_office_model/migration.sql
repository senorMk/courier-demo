/*
  Warnings:

  - You are about to drop the column `destinationId` on the `BranchCode` table. All the data in the column will be lost.
  - You are about to drop the column `destinationId` on the `Parcel` table. All the data in the column will be lost.
  - You are about to drop the `Destination` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `officeId` to the `BranchCode` table without a default value. This is not possible if the table is not empty.
  - Added the required column `routeId` to the `Office` table without a default value. This is not possible if the table is not empty.
  - Made the column `officeId` on table `Parcel` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "BranchCode" DROP CONSTRAINT "BranchCode_destinationId_fkey";

-- DropForeignKey
ALTER TABLE "Destination" DROP CONSTRAINT "Destination_routeId_fkey";

-- DropForeignKey
ALTER TABLE "Parcel" DROP CONSTRAINT "Parcel_destinationId_fkey";

-- DropForeignKey
ALTER TABLE "Parcel" DROP CONSTRAINT "Parcel_officeId_fkey";

-- AlterTable
ALTER TABLE "BranchCode" DROP COLUMN "destinationId",
ADD COLUMN     "officeId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Office" ADD COLUMN     "routeId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Parcel" DROP COLUMN "destinationId",
ALTER COLUMN "officeId" SET NOT NULL;

-- DropTable
DROP TABLE "Destination";

-- AddForeignKey
ALTER TABLE "Parcel" ADD CONSTRAINT "Parcel_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "Office"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Office" ADD CONSTRAINT "Office_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "Route"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BranchCode" ADD CONSTRAINT "BranchCode_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "Office"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
