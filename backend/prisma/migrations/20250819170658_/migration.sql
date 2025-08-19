/*
  Warnings:

  - A unique constraint covering the columns `[branchCode]` on the table `Destination` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `branchCode` to the `Destination` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Destination" ADD COLUMN     "branchCode" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Destination_branchCode_key" ON "Destination"("branchCode");
