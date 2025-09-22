/*
  Warnings:

  - Added the required column `orderType` to the `StopLossOrder` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "StopLossOrder" DROP CONSTRAINT "fk_stoploss_stock";

-- DropForeignKey
ALTER TABLE "StopLossOrder" DROP CONSTRAINT "fk_stoploss_user";

-- AlterTable
ALTER TABLE "StopLossOrder" ADD COLUMN     "limitPrice" DECIMAL(10,2),
ADD COLUMN     "orderType" TEXT NOT NULL,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "ReferralBadge" (
    "id" SERIAL NOT NULL,
    "referralId" INTEGER NOT NULL,
    "badgeName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReferralBadge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReferralBadge_referralId_idx" ON "ReferralBadge"("referralId");

-- CreateIndex
CREATE UNIQUE INDEX "ReferralBadge_referralId_badgeName_key" ON "ReferralBadge"("referralId", "badgeName");

-- AddForeignKey
ALTER TABLE "ReferralBadge" ADD CONSTRAINT "ReferralBadge_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "Referral"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StopLossOrder" ADD CONSTRAINT "StopLossOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StopLossOrder" ADD CONSTRAINT "StopLossOrder_stockId_fkey" FOREIGN KEY ("stockId") REFERENCES "Stock"("stock_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "idx_stoploss_stockId" RENAME TO "StopLossOrder_stockId_idx";
