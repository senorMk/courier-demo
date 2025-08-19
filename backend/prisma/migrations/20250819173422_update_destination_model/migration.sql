-- DropForeignKey
ALTER TABLE "Parcel" DROP CONSTRAINT "Parcel_destinationId_fkey";

-- AlterTable
ALTER TABLE "Parcel" ADD COLUMN     "officeId" TEXT;

-- AddForeignKey
ALTER TABLE "Parcel" ADD CONSTRAINT "Parcel_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "Destination"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Parcel" ADD CONSTRAINT "Parcel_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "Office"("id") ON DELETE SET NULL ON UPDATE CASCADE;
