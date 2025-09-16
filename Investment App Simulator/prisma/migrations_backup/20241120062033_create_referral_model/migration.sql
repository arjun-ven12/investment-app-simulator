-- CreateTable
CREATE TABLE "Referral" (
    "id" SERIAL NOT NULL,
    "referralLink" TEXT NOT NULL,
    "referralSignups" INTEGER NOT NULL DEFAULT 0,
    "successfulReferrals" INTEGER NOT NULL DEFAULT 0,
    "rewardsExchanged" INTEGER NOT NULL DEFAULT 0,
    "creditsEarned" INTEGER NOT NULL DEFAULT 0,
    "userId" INTEGER NOT NULL,
    "wallet" INTEGER NOT NULL DEFAULT 100000,

    CONSTRAINT "Referral_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Referral_referralLink_key" ON "Referral"("referralLink");

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
