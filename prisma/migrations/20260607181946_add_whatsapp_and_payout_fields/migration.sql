-- AlterTable
ALTER TABLE "User" ADD COLUMN     "bankAccountHolder" TEXT,
ADD COLUMN     "bankAccountNumber" TEXT,
ADD COLUMN     "ifscCode" TEXT,
ADD COLUMN     "payoutMethod" TEXT,
ADD COLUMN     "upiId" TEXT,
ADD COLUMN     "whatsappNumber" TEXT;

-- CreateTable
CREATE TABLE "PayoutAuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changeDetails" TEXT NOT NULL,

    CONSTRAINT "PayoutAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PayoutAuditLog_userId_changedAt_idx" ON "PayoutAuditLog"("userId", "changedAt");

-- AddForeignKey
ALTER TABLE "PayoutAuditLog" ADD CONSTRAINT "PayoutAuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
