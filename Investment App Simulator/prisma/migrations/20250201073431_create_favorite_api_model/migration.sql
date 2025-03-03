-- CreateTable
CREATE TABLE "FavoriteApi" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "symbol" TEXT NOT NULL,

    CONSTRAINT "FavoriteApi_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FavoriteApi_userId_symbol_key" ON "FavoriteApi"("userId", "symbol");

-- AddForeignKey
ALTER TABLE "FavoriteApi" ADD CONSTRAINT "FavoriteApi_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
