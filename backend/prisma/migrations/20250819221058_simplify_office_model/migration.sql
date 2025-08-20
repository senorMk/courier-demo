-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "OfficeType" ADD VALUE 'DISPATCH';
ALTER TYPE "OfficeType" ADD VALUE 'TRANSIT';

-- DropForeignKey
ALTER TABLE "Office" DROP CONSTRAINT "Office_routeId_fkey";
