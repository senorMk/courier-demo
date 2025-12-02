/*
  Warnings:

  - You are about to drop the column `officeType` on the `Office` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Office" DROP COLUMN "officeType",
ADD COLUMN     "officeTypes" "OfficeType"[];
