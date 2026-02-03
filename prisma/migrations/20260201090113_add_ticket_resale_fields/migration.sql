/*
  Warnings:

  - You are about to drop the column `userId` on the `Message` table. All the data in the column will be lost.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "OrderStatus" ADD VALUE 'WAITING_FOR_TRANSFER';
ALTER TYPE "OrderStatus" ADD VALUE 'TRANSFER_INITIATED';
ALTER TYPE "OrderStatus" ADD VALUE 'EVIDENCE_UPLOADED';
ALTER TYPE "OrderStatus" ADD VALUE 'DISPUTED';
ALTER TYPE "OrderStatus" ADD VALUE 'CANCELLED';

-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT "Message_userId_fkey";

-- AlterTable
ALTER TABLE "Message" DROP COLUMN "userId",
ADD COLUMN     "conversationId" TEXT;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "buyerConfirmedAt" TIMESTAMP(3),
ADD COLUMN     "evidenceUploadedAt" TIMESTAMP(3),
ADD COLUMN     "evidenceUrl" TEXT,
ADD COLUMN     "platformFeeBuyer" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
ADD COLUMN     "platformFeeSeller" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
ADD COLUMN     "ticketPartner" TEXT,
ADD COLUMN     "transferDetails" TEXT,
ADD COLUMN     "transferStartedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Products" ADD COLUMN     "image" TEXT,
ALTER COLUMN "imageUrl" DROP NOT NULL;

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ConversationParticipants" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ConversationParticipants_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_ConversationParticipants_B_index" ON "_ConversationParticipants"("B");

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ConversationParticipants" ADD CONSTRAINT "_ConversationParticipants_A_fkey" FOREIGN KEY ("A") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ConversationParticipants" ADD CONSTRAINT "_ConversationParticipants_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
