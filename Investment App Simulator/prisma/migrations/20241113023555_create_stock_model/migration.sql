/*
  Warnings:

  - You are about to drop the `HistoricalPrice` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "HistoricalPrice" DROP CONSTRAINT "HistoricalPrice_stock_id_fkey";

-- DropTable
DROP TABLE "HistoricalPrice";

-- CreateTable
CREATE TABLE "HistPrice" (
    "price_id" SERIAL NOT NULL,
    "stock_id" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "open_price" DECIMAL(10,2) NOT NULL,
    "high_price" DECIMAL(10,2) NOT NULL,
    "low_price" DECIMAL(10,2) NOT NULL,
    "close_price" DECIMAL(10,2) NOT NULL,
    "volume" BIGINT NOT NULL,

    CONSTRAINT "HistPrice_pkey" PRIMARY KEY ("price_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HistPrice_stock_id_date_key" ON "HistPrice"("stock_id", "date");

-- AddForeignKey
ALTER TABLE "HistPrice" ADD CONSTRAINT "HistPrice_stock_id_fkey" FOREIGN KEY ("stock_id") REFERENCES "Stock"("stock_id") ON DELETE RESTRICT ON UPDATE CASCADE;
