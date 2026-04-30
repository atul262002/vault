-- Create enums
CREATE TYPE "DisputeStatus" AS ENUM ('ACTIVE', 'UNDER_REVIEW', 'RESOLVED');
CREATE TYPE "DisputeDecisionType" AS ENUM ('REFUND', 'CREDIT');

-- Create disputes table
CREATE TABLE "Dispute" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "status" "DisputeStatus" NOT NULL DEFAULT 'ACTIVE',
    "buyerReason" TEXT NOT NULL,
    "buyerEvidenceUrl" TEXT,
    "sellerEvidenceUrl" TEXT,
    "adminDecisionReason" TEXT,
    "decisionType" "DisputeDecisionType",
    "decidedAt" TIMESTAMP(3),
    "decidedBy" TEXT,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "messages" JSONB,
    "notificationsLog" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Dispute_pkey" PRIMARY KEY ("id")
);

-- indexes and constraints
CREATE UNIQUE INDEX "Dispute_transactionId_key" ON "Dispute"("transactionId");
CREATE INDEX "Dispute_status_openedAt_idx" ON "Dispute"("status", "openedAt");

ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
