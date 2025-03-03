-- DropForeignKey
ALTER TABLE "Stock" DROP CONSTRAINT "Stock_company_id_fkey";

-- AlterTable
ALTER TABLE "Stock" ALTER COLUMN "company_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Stock" ADD CONSTRAINT "Stock_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
