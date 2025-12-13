-- AlterTable
ALTER TABLE "Parcel" ADD COLUMN "createdById" TEXT;

-- AddForeignKey
ALTER TABLE "Parcel" ADD CONSTRAINT "Parcel_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;