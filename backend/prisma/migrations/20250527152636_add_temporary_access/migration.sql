-- CreateTable
CREATE TABLE "TemporaryAccess" (
    "id" TEXT NOT NULL,
    "visitorName" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endTime" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "TemporaryAccess_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "TemporaryAccess" ADD CONSTRAINT "TemporaryAccess_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Security"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
