-- DropForeignKey
ALTER TABLE "TemporaryAccess" DROP CONSTRAINT "TemporaryAccess_createdById_fkey";

-- AddForeignKey
ALTER TABLE "TemporaryAccess" ADD CONSTRAINT "TemporaryAccess_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
