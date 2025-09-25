/*
  Warnings:

  - Added the required column `tradeType` to the `StopMarketOrder` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "StopMarketOrder" ADD COLUMN     "tradeType" TEXT NOT NULL;
