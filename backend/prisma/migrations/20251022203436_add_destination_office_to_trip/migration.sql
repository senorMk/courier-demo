-- AlterTable
ALTER TABLE "Trip" ADD COLUMN     "destinationOfficeId" TEXT;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_destinationOfficeId_fkey" FOREIGN KEY ("destinationOfficeId") REFERENCES "Office"("id") ON DELETE SET NULL ON UPDATE CASCADE;
