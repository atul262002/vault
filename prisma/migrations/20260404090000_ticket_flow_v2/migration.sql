DO $$
BEGIN
  ALTER TYPE "OrderStatus" RENAME VALUE 'PENDING' TO 'PAYMENT_PENDING';
EXCEPTION
  WHEN invalid_parameter_value THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TYPE "OrderStatus" RENAME VALUE 'WAITING_FOR_TRANSFER' TO 'FUNDS_HELD';
EXCEPTION
  WHEN invalid_parameter_value THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TYPE "OrderStatus" RENAME VALUE 'TRANSFER_INITIATED' TO 'TRANSFER_IN_PROGRESS';
EXCEPTION
  WHEN invalid_parameter_value THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TYPE "OrderStatus" RENAME VALUE 'EVIDENCE_UPLOADED' TO 'AWAITING_CONFIRMATION';
EXCEPTION
  WHEN invalid_parameter_value THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TYPE "OrderStatus" RENAME VALUE 'COMPLETED' TO 'COMPLETE';
EXCEPTION
  WHEN invalid_parameter_value THEN NULL;
END $$;

ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'LISTED';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'TRANSFER_PENDING';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'REFUNDED';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'SELLER_TIMEOUT';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'EVIDENCE_TIMEOUT';

ALTER TABLE "Products"
ADD COLUMN IF NOT EXISTS "listingId" TEXT,
ADD COLUMN IF NOT EXISTS "ticketQuantity" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS "ticketPartner" TEXT NOT NULL DEFAULT 'Other';

UPDATE "Products"
SET "listingId" = CONCAT('VLT-', UPPER(SUBSTRING(REPLACE("id", '-', '') FROM 1 FOR 5)))
WHERE "listingId" IS NULL;

ALTER TABLE "Products"
ALTER COLUMN "listingId" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "Products_listingId_key" ON "Products"("listingId");
CREATE INDEX IF NOT EXISTS "Products_listingId_idx" ON "Products"("listingId");

ALTER TABLE "Order"
ADD COLUMN IF NOT EXISTS "receiverName" TEXT,
ADD COLUMN IF NOT EXISTS "receiverPhone" TEXT,
ADD COLUMN IF NOT EXISTS "termsAccepted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "transferDelayUntil" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "transferPendingAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "disputeReason" TEXT,
ADD COLUMN IF NOT EXISTS "buyerCounterEvidenceUrl" TEXT;

CREATE TABLE IF NOT EXISTS "Notification" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "orderId" TEXT,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "isRead" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "OrderStatusHistory" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "fromStatus" "OrderStatus",
  "toStatus" "OrderStatus" NOT NULL,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrderStatusHistory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "OrderStatusHistory_orderId_createdAt_idx" ON "OrderStatusHistory"("orderId", "createdAt");

DO $$
BEGIN
  ALTER TABLE "Notification"
  ADD CONSTRAINT "Notification_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "Notification"
  ADD CONSTRAINT "Notification_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "OrderStatusHistory"
  ADD CONSTRAINT "OrderStatusHistory_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

INSERT INTO "OrderStatusHistory" ("id", "orderId", "fromStatus", "toStatus", "note", "createdAt")
SELECT
  md5(random()::text || clock_timestamp()::text || "id"),
  "id",
  NULL,
  "status",
  'Backfilled from existing order state',
  COALESCE("updatedAt", "createdAt", CURRENT_TIMESTAMP)
FROM "Order"
WHERE NOT EXISTS (
  SELECT 1
  FROM "OrderStatusHistory"
  WHERE "OrderStatusHistory"."orderId" = "Order"."id"
);
