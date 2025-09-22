/*
  Warnings:

  - You are about to drop the `StopLossOrder` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "StopLossOrder" DROP CONSTRAINT "StopLossOrder_stockId_fkey";

-- DropForeignKey
ALTER TABLE "StopLossOrder" DROP CONSTRAINT "StopLossOrder_userId_fkey";

-- DropTable
DROP TABLE "StopLossOrder";

-- CreateTable
CREATE TABLE "StopMarketOrder" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "stockId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "triggerPrice" DECIMAL(10,2) NOT NULL,
    "orderType" TEXT NOT NULL,
    "limitPrice" DECIMAL(10,2),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StopMarketOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StopMarketOrder_stockId_idx" ON "StopMarketOrder"("stockId");

-- AddForeignKey
ALTER TABLE "StopMarketOrder" ADD CONSTRAINT "StopMarketOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StopMarketOrder" ADD CONSTRAINT "StopMarketOrder_stockId_fkey" FOREIGN KEY ("stockId") REFERENCES "Stock"("stock_id") ON DELETE CASCADE ON UPDATE CASCADE;
