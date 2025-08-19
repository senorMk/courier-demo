/*
  Warnings:

  - Changed the type of `officeType` on the `Office` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "OfficeType" AS ENUM ('SENDING', 'RECEIVING');

-- AlterTable
ALTER TABLE "Office" DROP COLUMN "officeType",
ADD COLUMN     "officeType" "OfficeType" NOT NULL;
