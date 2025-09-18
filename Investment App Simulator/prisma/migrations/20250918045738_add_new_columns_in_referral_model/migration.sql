-- AlterTable
ALTER TABLE "Referral" ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "tier" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "ReferralUsage" ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'PENDING';
