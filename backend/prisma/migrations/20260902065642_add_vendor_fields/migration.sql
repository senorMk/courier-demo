-- AlterTable
ALTER TABLE "Parcel" ADD COLUMN     "vendorContactInfo" TEXT,
ADD COLUMN     "vendorName" TEXT,
ADD COLUMN     "vendorTrackingNumber" TEXT,
ALTER COLUMN "cargoType" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Parcel" ADD CONSTRAINT "Parcel_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
