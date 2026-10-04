import { OrderStatus, Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { normalizeOrderStatus } from "@/lib/order-flow";

/**
 * Error with an HTTP status, thrown from inside an order lock to abort the
 * transaction and tell the caller why.
 */
export class OrderActionError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "OrderActionError";
  }
}

/**
 * Runs `fn` while holding a row lock on the order, with the order's current
 * status read under that lock.
 *
 * Every state change on an order (payment capture, transfer, evidence,
 * confirm, dispute, cancel, timeouts, admin decisions, cron jobs) must go
 * through this. Without it two requests can both pass a status check and
 * both act: e.g. a double-clicked "confirm" decrementing stock twice, or a
 * dispute racing the auto-complete job so the buyer is refunded *and* the
 * seller is paid.
 *
 * Rules inside `fn`:
 * - Re-check the status you were given; it's the authoritative one.
 * - Write to the database only through `tx`.
 * - External money calls (payouts/refunds) may run inside `fn`, so a
 *   concurrent request waits for them instead of repeating them.
 *
 * `FOR NO KEY UPDATE` blocks other writers of this order but still lets
 * inserts into tables that reference it (payments, history, notifications).
 */
export async function withLockedOrder<T>(
  orderId: string,
  fn: (tx: Prisma.TransactionClient, status: OrderStatus) => Promise<T>
): Promise<T> {
  return prisma.$transaction(
    async (tx) => {
      const [row] = await tx.$queryRaw<Array<{ status: string }>>(Prisma.sql`
        SELECT "status" FROM "Order" WHERE "id" = ${orderId} FOR NO KEY UPDATE
      `);

      if (!row) {
        throw new OrderActionError("Order not found", 404);
      }

      return fn(tx, normalizeOrderStatus(row.status));
    },
    // Payout/refund calls run inside the lock, so allow time for them.
    { maxWait: 15_000, timeout: 60_000 }
  );
}

/** Throws unless the locked status is one of `allowed`. */
export function requireStatus(status: OrderStatus, allowed: OrderStatus[], message: string) {
  if (!allowed.includes(status)) {
    throw new OrderActionError(message, 409);
  }
}
