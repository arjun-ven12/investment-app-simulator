/*
  Warnings:

  - You are about to alter the column `probability` on the `Reward` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `Decimal(5,3)`.

*/
-- AlterTable
ALTER TABLE "Reward" ALTER COLUMN "probability" DROP DEFAULT,
ALTER COLUMN "probability" SET DATA TYPE DECIMAL(5,3);
