-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "isRead" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "lastReminderSentAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Products" ADD COLUMN     "isSold" BOOLEAN NOT NULL DEFAULT false;
