/*
  Warnings:

  - A unique constraint covering the columns `[name]` on the table `BranchCode` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name]` on the table `Destination` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[branchCode]` on the table `Office` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name]` on the table `Route` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[plainTextCode]` on the table `TrackingCode` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "BranchCode_name_key" ON "BranchCode"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Destination_name_key" ON "Destination"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Office_branchCode_key" ON "Office"("branchCode");

-- CreateIndex
CREATE UNIQUE INDEX "Route_name_key" ON "Route"("name");

-- CreateIndex
CREATE UNIQUE INDEX "TrackingCode_plainTextCode_key" ON "TrackingCode"("plainTextCode");
