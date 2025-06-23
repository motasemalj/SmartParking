/*
  Warnings:

  - You are about to drop the column `endTime` on the `TemporaryAccess` table. All the data in the column will be lost.
  - You are about to drop the column `phoneNumber` on the `TemporaryAccess` table. All the data in the column will be lost.
  - You are about to drop the column `startTime` on the `TemporaryAccess` table. All the data in the column will be lost.
  - You are about to drop the column `visitorName` on the `TemporaryAccess` table. All the data in the column will be lost.
  - Added the required column `country` to the `TemporaryAccess` table without a default value. This is not possible if the table is not empty.
  - Added the required column `expiresAt` to the `TemporaryAccess` table without a default value. This is not possible if the table is not empty.
  - Added the required column `plateCode` to the `TemporaryAccess` table without a default value. This is not possible if the table is not empty.
  - Added the required column `plateNumber` to the `TemporaryAccess` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "TemporaryAccess" DROP COLUMN "endTime",
DROP COLUMN "phoneNumber",
DROP COLUMN "startTime",
DROP COLUMN "visitorName",
ADD COLUMN     "country" TEXT NOT NULL,
ADD COLUMN     "emirate" TEXT,
ADD COLUMN     "expiresAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "plateCode" TEXT NOT NULL,
ADD COLUMN     "plateNumber" TEXT NOT NULL;
