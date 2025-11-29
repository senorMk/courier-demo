-- AlterEnum
BEGIN;
CREATE TYPE "CargoType_new" AS ENUM ('NORMAL', 'FRAGILE', 'ELECTRONIC', 'DOCUMENT');
ALTER TABLE "Parcel" ALTER COLUMN "cargoType" DROP DEFAULT;
ALTER TABLE "Parcel" ALTER COLUMN "cargoType" TYPE "CargoType_new" USING ("cargoType"::text::"CargoType_new");
ALTER TYPE "CargoType" RENAME TO "CargoType_old";
ALTER TYPE "CargoType_new" RENAME TO "CargoType";
DROP TYPE "CargoType_old";
ALTER TABLE "Parcel" ALTER COLUMN "cargoType" SET DEFAULT 'NORMAL';
COMMIT;

-- AlterTable
ALTER TABLE "Parcel" ALTER COLUMN "cargoType" DROP NOT NULL;
