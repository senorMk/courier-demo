/*
  Warnings:

  - Added the required column `userId` to the `ScanningSession` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "ScanningSession" DROP CONSTRAINT "ScanningSession_staffId_fkey";

-- AlterTable
ALTER TABLE "ScanningSession" ADD COLUMN     "userId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "ScanningSession" ADD CONSTRAINT "ScanningSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
