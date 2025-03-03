/*
  Warnings:

  - You are about to drop the column `Cost` on the `RedeemBy` table. All the data in the column will be lost.
  - You are about to drop the column `redeemedById` on the `Reward` table. All the data in the column will be lost.
  - Added the required column `cost` to the `RedeemBy` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Reward" DROP CONSTRAINT "Reward_redeemedById_fkey";

-- DropIndex
DROP INDEX "Reward_redeemedById_idx";

-- AlterTable
ALTER TABLE "RedeemBy" DROP COLUMN "Cost",
ADD COLUMN     "cost" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Reward" DROP COLUMN "redeemedById",
ADD COLUMN     "userId" INTEGER;

-- AddForeignKey
ALTER TABLE "Reward" ADD CONSTRAINT "Reward_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
