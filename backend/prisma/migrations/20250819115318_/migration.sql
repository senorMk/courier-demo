/*
  Warnings:

  - A unique constraint covering the columns `[emailAddress]` on the table `Customer` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[phoneNumber]` on the table `Customer` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[idNumber]` on the table `Customer` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `emailAddress` to the `Customer` table without a default value. This is not possible if the table is not empty.
  - Added the required column `plainTextCode` to the `TrackingCode` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "emailAddress" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "TrackingCode" ADD COLUMN     "plainTextCode" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Customer_emailAddress_key" ON "Customer"("emailAddress");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_phoneNumber_key" ON "Customer"("phoneNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_idNumber_key" ON "Customer"("idNumber");
