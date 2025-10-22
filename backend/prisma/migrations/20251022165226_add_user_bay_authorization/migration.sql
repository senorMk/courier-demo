-- AlterTable
ALTER TABLE "User" ADD COLUMN     "authorizedBayTypes" "BayType"[] DEFAULT ARRAY[]::"BayType"[];
