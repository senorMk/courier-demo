-- CreateTable
CREATE TABLE "ScanningSession" (
    "id" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "officeId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "mailBagCode" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScanningSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScannedParcel" (
    "id" TEXT NOT NULL,
    "scanningSessionId" TEXT NOT NULL,
    "parcelId" TEXT NOT NULL,
    "scannedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scannedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScannedParcel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ScanningSession_mailBagCode_key" ON "ScanningSession"("mailBagCode");

-- CreateIndex
CREATE UNIQUE INDEX "ScannedParcel_scanningSessionId_parcelId_key" ON "ScannedParcel"("scanningSessionId", "parcelId");

-- AddForeignKey
ALTER TABLE "ScanningSession" ADD CONSTRAINT "ScanningSession_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScanningSession" ADD CONSTRAINT "ScanningSession_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "Office"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScanningSession" ADD CONSTRAINT "ScanningSession_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "Route"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScannedParcel" ADD CONSTRAINT "ScannedParcel_scanningSessionId_fkey" FOREIGN KEY ("scanningSessionId") REFERENCES "ScanningSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScannedParcel" ADD CONSTRAINT "ScannedParcel_parcelId_fkey" FOREIGN KEY ("parcelId") REFERENCES "Parcel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScannedParcel" ADD CONSTRAINT "ScannedParcel_scannedById_fkey" FOREIGN KEY ("scannedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
