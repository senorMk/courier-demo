/*
  Warnings:

  - Made the column `updatedAt` on table `AccessLog` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updatedAt` on table `Customer` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updatedAt` on table `Office` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updatedAt` on table `Parcel` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updatedAt` on table `ParcelItem` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updatedAt` on table `Role` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updatedAt` on table `TrackingCode` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updatedAt` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "AccessLog" ALTER COLUMN "updatedAt" SET NOT NULL;

-- AlterTable
ALTER TABLE "Customer" ALTER COLUMN "updatedAt" SET NOT NULL;

-- AlterTable
ALTER TABLE "Office" ALTER COLUMN "updatedAt" SET NOT NULL;

-- AlterTable
ALTER TABLE "Parcel" ALTER COLUMN "updatedAt" SET NOT NULL;

-- AlterTable
ALTER TABLE "ParcelItem" ALTER COLUMN "updatedAt" SET NOT NULL;

-- AlterTable
ALTER TABLE "Role" ALTER COLUMN "updatedAt" SET NOT NULL;

-- AlterTable
ALTER TABLE "TrackingCode" ALTER COLUMN "updatedAt" SET NOT NULL;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "updatedAt" SET NOT NULL;
