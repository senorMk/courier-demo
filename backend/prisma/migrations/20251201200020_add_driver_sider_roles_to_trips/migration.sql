-- CreateTable
CREATE TABLE "Sider" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phoneNumber" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sider_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Sider_phoneNumber_key" ON "Sider"("phoneNumber");

-- AlterTable
ALTER TABLE "Trip" ADD COLUMN "mainDriverId" TEXT;
ALTER TABLE "Trip" ADD COLUMN "secondaryDriverId" TEXT;
ALTER TABLE "Trip" ADD COLUMN "siderId" TEXT;

-- Data Migration: Create a temporary driver if needed and assign to existing trips
DO $$
DECLARE
    temp_driver_id TEXT;
    driver_count INTEGER;
BEGIN
    -- Check if any drivers exist
    SELECT COUNT(*) INTO driver_count FROM "Driver";

    IF driver_count = 0 THEN
        -- Create a temporary/default driver
        temp_driver_id := gen_random_uuid()::TEXT;
        INSERT INTO "Driver" (id, "firstName", "lastName", active, "createdAt", "updatedAt")
        VALUES (temp_driver_id, 'Temporary', 'Driver', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
    ELSE
        -- Use the first existing driver
        SELECT id INTO temp_driver_id FROM "Driver" LIMIT 1;
    END IF;

    -- Update existing trips to use this driver as main driver
    UPDATE "Trip" SET "mainDriverId" = temp_driver_id WHERE "mainDriverId" IS NULL;
END $$;

-- Make mainDriverId required
ALTER TABLE "Trip" ALTER COLUMN "mainDriverId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_mainDriverId_fkey" FOREIGN KEY ("mainDriverId") REFERENCES "Driver"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_secondaryDriverId_fkey" FOREIGN KEY ("secondaryDriverId") REFERENCES "Driver"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_siderId_fkey" FOREIGN KEY ("siderId") REFERENCES "Sider"("id") ON DELETE SET NULL ON UPDATE CASCADE;
