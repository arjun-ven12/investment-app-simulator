-- AlterTable
ALTER TABLE "User" ADD COLUMN     "phoneNumber" INTEGER;

-- CreateTable
CREATE TABLE "FavoriteStock" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "stockId" INTEGER NOT NULL,

    CONSTRAINT "FavoriteStock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FavoriteStock_userId_stockId_key" ON "FavoriteStock"("userId", "stockId");

-- AddForeignKey
ALTER TABLE "FavoriteStock" ADD CONSTRAINT "FavoriteStock_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FavoriteStock" ADD CONSTRAINT "FavoriteStock_stockId_fkey" FOREIGN KEY ("stockId") REFERENCES "Stock"("stock_id") ON DELETE CASCADE ON UPDATE CASCADE;
