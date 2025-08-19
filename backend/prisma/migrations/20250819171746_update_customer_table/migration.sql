/*
  Warnings:

  - You are about to drop the column `type` on the `Customer` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Customer" DROP COLUMN "type";

-- DropEnum
DROP TYPE "CustomerType";
