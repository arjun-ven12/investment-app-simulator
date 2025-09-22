-- AlterTable
ALTER TABLE "Referral" ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "tier" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "ReferralUsage" ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'PENDING';


-- Create StopLossOrder table
CREATE TABLE "StopLossOrder" (
    "id" SERIAL PRIMARY KEY,
    "userId" INTEGER NOT NULL,
    "stockId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "triggerPrice" DECIMAL(10,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now(),

    CONSTRAINT "fk_stoploss_user" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE,
    CONSTRAINT "fk_stoploss_stock" FOREIGN KEY ("stockId") REFERENCES "Stock"("stock_id") ON DELETE CASCADE
);

-- Optional: add index on stockId
CREATE INDEX "idx_stoploss_stockId" ON "StopLossOrder" ("stockId");