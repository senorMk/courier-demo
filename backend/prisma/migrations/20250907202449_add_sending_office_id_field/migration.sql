-- AlterTable
ALTER TABLE "Parcel" ADD COLUMN     "sendingOfficeId" TEXT;

-- AddForeignKey
ALTER TABLE "Parcel" ADD CONSTRAINT "Parcel_sendingOfficeId_fkey" FOREIGN KEY ("sendingOfficeId") REFERENCES "Office"("id") ON DELETE SET NULL ON UPDATE CASCADE;
