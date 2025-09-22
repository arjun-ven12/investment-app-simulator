-- CreateTable
CREATE TABLE "StopLimitOrder" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "stockId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "triggerPrice" DECIMAL(10,2) NOT NULL,
    "limitPrice" DECIMAL(10,2) NOT NULL,
    "tradeType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StopLimitOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StopLimitOrder_stockId_idx" ON "StopLimitOrder"("stockId");

-- AddForeignKey
ALTER TABLE "StopLimitOrder" ADD CONSTRAINT "StopLimitOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StopLimitOrder" ADD CONSTRAINT "StopLimitOrder_stockId_fkey" FOREIGN KEY ("stockId") REFERENCES "Stock"("stock_id") ON DELETE CASCADE ON UPDATE CASCADE;
