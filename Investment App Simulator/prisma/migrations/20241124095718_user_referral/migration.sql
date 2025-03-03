/*
  Warnings:

  - A unique constraint covering the columns `[userReferralLink]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "userReferralLink" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_userReferralLink_key" ON "User"("userReferralLink");
ALTER TABLE "User"
ADD CONSTRAINT "fk_user_referralLink"
FOREIGN KEY ("userReferralLink") REFERENCES "Referral" ("referralLink") ON DELETE SET NULL;