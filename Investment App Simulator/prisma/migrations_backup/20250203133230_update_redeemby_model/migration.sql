/*
  Warnings:

  - Added the required column `cardCode` to the `RedeemBy` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "RedeemBy" ADD COLUMN     "cardCode" TEXT NOT NULL;
