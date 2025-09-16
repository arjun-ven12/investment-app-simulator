-- CreateTable
CREATE TABLE "Reward" (
    "id" SERIAL NOT NULL,
    "redeemedById" INTEGER NOT NULL,
    "rewardName" TEXT NOT NULL,
    "rewardDescription" TEXT NOT NULL,
    "cost" INTEGER NOT NULL,

    CONSTRAINT "Reward_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RedeemBy" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "rewardName" TEXT NOT NULL,
    "rewardDescription" TEXT NOT NULL,
    "Cost" INTEGER NOT NULL,
    "dateOrdered" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RedeemBy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Reward_redeemedById_idx" ON "Reward"("redeemedById");

-- CreateIndex
CREATE INDEX "RedeemBy_userId_idx" ON "RedeemBy"("userId");

-- AddForeignKey
ALTER TABLE "Reward" ADD CONSTRAINT "Reward_redeemedById_fkey" FOREIGN KEY ("redeemedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RedeemBy" ADD CONSTRAINT "RedeemBy_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
