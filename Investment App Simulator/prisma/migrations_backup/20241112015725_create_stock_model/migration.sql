-- CreateTable
CREATE TABLE "Stock" (
    "stock_id" SERIAL NOT NULL,
    "symbol" VARCHAR(10) NOT NULL,
    "company_name" VARCHAR(255) NOT NULL,
    "sector" VARCHAR(100),
    "change" INTEGER NOT NULL,

    CONSTRAINT "Stock_pkey" PRIMARY KEY ("stock_id")
);

-- CreateTable
CREATE TABLE "HistoricalPrice" (
    "price_id" SERIAL NOT NULL,
    "stock_id" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "open_price" DECIMAL(10,2) NOT NULL,
    "high_price" DECIMAL(10,2) NOT NULL,
    "low_price" DECIMAL(10,2) NOT NULL,
    "close_price" DECIMAL(10,2) NOT NULL,
    "volume" BIGINT NOT NULL,

    CONSTRAINT "HistoricalPrice_pkey" PRIMARY KEY ("price_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Stock_symbol_key" ON "Stock"("symbol");

-- CreateIndex
CREATE UNIQUE INDEX "HistoricalPrice_stock_id_date_key" ON "HistoricalPrice"("stock_id", "date");

-- AddForeignKey
ALTER TABLE "HistoricalPrice" ADD CONSTRAINT "HistoricalPrice_stock_id_fkey" FOREIGN KEY ("stock_id") REFERENCES "Stock"("stock_id") ON DELETE RESTRICT ON UPDATE CASCADE;
