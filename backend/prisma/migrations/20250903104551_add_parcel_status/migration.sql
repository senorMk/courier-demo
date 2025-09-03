-- CreateEnum
CREATE TYPE "ParcelStatus" AS ENUM ('PENDING', 'READY_FOR_COLLECTION', 'COLLECTED');

-- AlterTable
ALTER TABLE "Parcel" ADD COLUMN     "status" "ParcelStatus" NOT NULL DEFAULT 'PENDING';
