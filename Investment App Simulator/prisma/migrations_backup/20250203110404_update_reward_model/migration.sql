/*
  Warnings:

  - You are about to drop the column `cost` on the `RedeemBy` table. All the data in the column will be lost.
  - You are about to drop the column `rewardDescription` on the `RedeemBy` table. All the data in the column will be lost.
  - You are about to drop the column `rewardName` on the `RedeemBy` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `Reward` table. All the data in the column will be lost.
  - Added the required column `rewardId` to the `RedeemBy` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Reward" DROP CONSTRAINT "Reward_userId_fkey";

-- AlterTable
ALTER TABLE "RedeemBy" DROP COLUMN "cost",
DROP COLUMN "rewardDescription",
DROP COLUMN "rewardName",
ADD COLUMN     "rewardId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Reward" DROP COLUMN "userId";

-- CreateIndex
CREATE INDEX "RedeemBy_rewardId_idx" ON "RedeemBy"("rewardId");

-- AddForeignKey
ALTER TABLE "RedeemBy" ADD CONSTRAINT "RedeemBy_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES "Reward"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
