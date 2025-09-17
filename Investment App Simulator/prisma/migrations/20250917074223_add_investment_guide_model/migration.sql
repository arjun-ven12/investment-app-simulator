-- CreateTable
CREATE TABLE "IntradayPrice2" (
    "id" SERIAL NOT NULL,
    "stockId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "openPrice" DECIMAL(10,2),
    "highPrice" DECIMAL(10,2),
    "lowPrice" DECIMAL(10,2),
    "closePrice" DECIMAL(10,2) NOT NULL,
    "volume" BIGINT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntradayPrice2_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntradayPrice3" (
    "id" SERIAL NOT NULL,
    "stockId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "openPrice" DECIMAL(10,2),
    "highPrice" DECIMAL(10,2),
    "lowPrice" DECIMAL(10,2),
    "closePrice" DECIMAL(10,2) NOT NULL,
    "volume" BIGINT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntradayPrice3_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvestmentGuide" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvestmentGuide_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IntradayPrice2_stockId_idx" ON "IntradayPrice2"("stockId");

-- CreateIndex
CREATE UNIQUE INDEX "IntradayPrice2_stockId_date_key" ON "IntradayPrice2"("stockId", "date");

-- CreateIndex
CREATE INDEX "IntradayPrice3_stockId_idx" ON "IntradayPrice3"("stockId");

-- CreateIndex
CREATE UNIQUE INDEX "stockId_date" ON "IntradayPrice3"("stockId", "date");

-- AddForeignKey
ALTER TABLE "IntradayPrice2" ADD CONSTRAINT "IntradayPrice2_stockId_fkey" FOREIGN KEY ("stockId") REFERENCES "Stock"("stock_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntradayPrice3" ADD CONSTRAINT "IntradayPrice3_stockId_fkey" FOREIGN KEY ("stockId") REFERENCES "Stock"("stock_id") ON DELETE RESTRICT ON UPDATE CASCADE;
