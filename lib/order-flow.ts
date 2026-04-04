import { OrderStatus, Prisma } from "@prisma/client";

type PrismaLike = Prisma.TransactionClient | Prisma.DefaultPrismaClient;

export const SELLER_TIMEOUT_MINUTES = 30;
export const TRANSFER_GRACE_MINUTES = 5;
export const EVIDENCE_TIMEOUT_MINUTES = 15;
export const BUYER_AUTO_CONFIRM_MINUTES = 10;

const legacyStatusMap: Record<string, OrderStatus> = {
  PENDING: "PAYMENT_PENDING",
  WAITING_FOR_TRANSFER: "FUNDS_HELD",
  TRANSFER_INITIATED: "TRANSFER_IN_PROGRESS",
  EVIDENCE_UPLOADED: "AWAITING_CONFIRMATION",
  COMPLETED: "COMPLETE",
};

export function normalizeOrderStatus(status: string): OrderStatus {
  return (legacyStatusMap[status] ?? status) as OrderStatus;
}

export function getTransferDelayUntil(startedAt: Date) {
  return new Date(startedAt.getTime() + TRANSFER_GRACE_MINUTES * 60 * 1000);
}

export function getEvidenceDeadline(startedAt: Date) {
  return new Date(startedAt.getTime() + EVIDENCE_TIMEOUT_MINUTES * 60 * 1000);
}

export function getBuyerAutoConfirmDeadline(evidenceUploadedAt: Date) {
  return new Date(evidenceUploadedAt.getTime() + BUYER_AUTO_CONFIRM_MINUTES * 60 * 1000);
}

export async function createNotificationRecord(
  db: PrismaLike,
  {
    userId,
    orderId,
    title,
    message,
  }: {
    userId: string;
    orderId?: string;
    title: string;
    message: string;
  }
) {
  const [notification] = await db.$queryRaw<Array<{
    id: string;
    userId: string;
    orderId: string | null;
    title: string;
    message: string;
    isRead: boolean;
    createdAt: Date;
  }>>(Prisma.sql`
    INSERT INTO "Notification" ("id", "userId", "orderId", "title", "message", "isRead", "createdAt")
    VALUES (
      ${crypto.randomUUID()},
      ${userId},
      ${orderId ?? null},
      ${title},
      ${message},
      false,
      NOW()
    )
    RETURNING *
  `);

  return notification;
}

export async function recordOrderStatus(
  db: PrismaLike,
  {
    orderId,
    fromStatus,
    toStatus,
    note,
  }: {
    orderId: string;
    fromStatus: OrderStatus | null;
    toStatus: OrderStatus;
    note?: string;
  }
) {
  const [statusHistory] = await db.$queryRaw<Array<{
    id: string;
    orderId: string;
    fromStatus: string | null;
    toStatus: string;
    note: string | null;
    createdAt: Date;
  }>>(Prisma.sql`
    INSERT INTO "OrderStatusHistory" ("id", "orderId", "fromStatus", "toStatus", "note", "createdAt")
    VALUES (
      ${crypto.randomUUID()},
      ${orderId},
      ${fromStatus ?? null}::"OrderStatus",
      ${toStatus}::"OrderStatus",
      ${note ?? null},
      NOW()
    )
    RETURNING *
  `);

  return statusHistory;
}
