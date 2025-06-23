/*
  Warnings:

  - A unique constraint covering the columns `[plateCode,plateNumber,country,type]` on the table `Plate` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Plate_plateCode_plateNumber_country_type_key" ON "Plate"("plateCode", "plateNumber", "country", "type");
