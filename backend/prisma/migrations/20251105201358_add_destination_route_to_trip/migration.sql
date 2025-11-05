-- AlterTable
ALTER TABLE "Trip" ADD COLUMN     "destinationRouteId" TEXT;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_destinationRouteId_fkey" FOREIGN KEY ("destinationRouteId") REFERENCES "Route"("id") ON DELETE SET NULL ON UPDATE CASCADE;
