/*
  Warnings:

  - You are about to drop the column `ticketPartner` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `transferDetails` on the `Order` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Dispute" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "ticketPartner",
DROP COLUMN "transferDetails";

-- AlterTable
ALTER TABLE "Products" ALTER COLUMN "ticketPartner" DROP DEFAULT;
