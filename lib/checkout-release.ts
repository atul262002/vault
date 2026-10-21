import { prisma } from "@/lib/db";
import { PAYMENT_PENDING_LOCK_MINUTES } from "@/lib/order-availability";
import { recordOrderStatus } from "@/lib/order-flow";
import { withLockedOrder } from "@/lib/order-lock";
import { completeOrderPayment } from "@/lib/razorpay-payment";

type RazorpayOrderPayment = { id: string; status: string };

// "created" covers payments still in progress, e.g. a UPI collect request
// waiting for approval on the buyer's phone. Releasing then would let the
// buyer approve a payment for a ticket that's no longer held.
const PAYMENT_IN_PROGRESS = new Set(["created", "authorized", "captured"]);

// Unreleased checkouts (crashed browser, dead phone) are cleaned up by the
// cron job once they're this old. The extra minutes after the reservation
// window give a slow payment time to land first.
export const STALE_CHECKOUT_MINUTES = PAYMENT_PENDING_LOCK_MINUTES + 5;

async function fetchOrderPayments(razorpayOrderId: string): Promise<RazorpayOrderPayment[] | null> {
  const keyId = process.env.RAZORPAYX_KEY_ID;
  const keySecret = process.env.RAZORPAYX_KEY_SECRET;
  if (!keyId || !keySecret || !/^order_[A-Za-z0-9]+$/.test(razorpayOrderId)) {
    return null;
  }

  try {
    const response = await fetch(`https://api.razorpay.com/v1/orders/${razorpayOrderId}/payments`, {
      headers: { Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}` },
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { items?: RazorpayOrderPayment[] };
    return data.items ?? [];
  } catch {
    return null;
  }
}

export type ReleaseResult =
  | { released: true }
  | {
      released: false;
      reason: "not_found" | "not_pending" | "other_window_open" | "payment_in_progress" | "paid" | "unverified";
    };

type OrderSnapshot = { updatedAt: Date; checkoutTokens: string[]; hasPayment: boolean };

/**
 * Cancels an unpaid checkout and frees its ticket, but only after Razorpay
 * confirms no payment for it is captured, authorized or in progress. If a
 * payment was captured, the order is completed instead.
 */
async function releaseOrder(
  order: { id: string; razorpayId: string },
  note: string,
  // Re-checked under the order lock right before cancelling.
  stillReleasable: (current: OrderSnapshot) => boolean
): Promise<ReleaseResult> {
  const payments = await fetchOrderPayments(order.razorpayId);
  if (payments === null) {
    // Can't confirm with Razorpay: keep the hold; it expires on its own.
    return { released: false, reason: "unverified" };
  }

  const captured = payments.find((p) => p.status === "captured");
  if (captured) {
    await completeOrderPayment({
      razorpayOrderId: order.razorpayId,
      razorpayPaymentId: captured.id,
      source: "order_status_poll",
    });
    return { released: false, reason: "paid" };
  }
  if (payments.some((p) => PAYMENT_IN_PROGRESS.has(p.status))) {
    return { released: false, reason: "payment_in_progress" };
  }

  return withLockedOrder(order.id, async (tx, status) => {
    if (status !== "PAYMENT_PENDING") {
      return { released: false, reason: "not_pending" } as const;
    }

    const current = await tx.order.findUniqueOrThrow({
      where: { id: order.id },
      select: { updatedAt: true, checkoutTokens: true, payment: { select: { id: true } } },
    });

    if (current.payment) {
      return { released: false, reason: "not_pending" } as const;
    }
    // e.g. the buyer opened another payment window on this checkout while
    // we were asking Razorpay; cancelling now would strand that window.
    if (!stillReleasable({ updatedAt: current.updatedAt, checkoutTokens: current.checkoutTokens, hasPayment: false })) {
      return { released: false, reason: "other_window_open" } as const;
    }

    await tx.order.update({ where: { id: order.id }, data: { status: "CANCELLED" } });
    await recordOrderStatus(tx, {
      orderId: order.id,
      fromStatus: status,
      toStatus: "CANCELLED",
      note,
    });
    return { released: true } as const;
  });
}

/**
 * Called when the buyer closes a Razorpay window, a payment fails, the tab
 * is closed mid-checkout, or the buyer cancels an unpaid order.
 *
 * `checkoutToken` identifies the payment window being closed. The same
 * checkout can be open in several windows (two tabs, or reopened after
 * closing), so closing one only removes its token, and the ticket is
 * released only once no window remains. Without a token (the buyer's
 * explicit Cancel button, or an older client) the release applies to the
 * whole checkout.
 */
export async function releaseUnpaidCheckout({
  razorpayOrderId,
  buyerId,
  reason,
  checkoutToken,
  wholeCheckout = false,
}: {
  razorpayOrderId: string;
  buyerId: string;
  reason: string;
  checkoutToken?: string;
  /** The buyer explicitly cancelled: applies to every window of this checkout. */
  wholeCheckout?: boolean;
}): Promise<ReleaseResult> {
  const order = await prisma.order.findUnique({
    where: { razorpayId: razorpayOrderId },
    select: { id: true, razorpayId: true, buyerId: true, status: true, updatedAt: true },
  });

  if (!order || order.buyerId !== buyerId) {
    return { released: false, reason: "not_found" };
  }
  if (order.status !== "PAYMENT_PENDING") {
    return { released: false, reason: "not_pending" };
  }

  const note = `Checkout abandoned (${reason}); ticket released`;

  if (wholeCheckout) {
    return releaseOrder(order, note, () => true);
  }

  if (checkoutToken) {
    // Drop this window's token first; it's closed whatever happens next.
    const othersOpen = await withLockedOrder(order.id, async (tx, status) => {
      if (status !== "PAYMENT_PENDING") return null;
      const current = await tx.order.findUniqueOrThrow({
        where: { id: order.id },
        select: { checkoutTokens: true },
      });
      const remaining = current.checkoutTokens.filter((t) => t !== checkoutToken);
      if (remaining.length !== current.checkoutTokens.length) {
        await tx.order.update({ where: { id: order.id }, data: { checkoutTokens: remaining } });
      }
      return remaining.length > 0;
    });

    if (othersOpen === null) return { released: false, reason: "not_pending" };
    if (othersOpen) return { released: false, reason: "other_window_open" };

    return releaseOrder(order, note, (current) => current.checkoutTokens.length === 0);
  }

  // Older client without a token: keep the checkout if anything touched it
  // (e.g. it was reopened) while we were asking Razorpay.
  const seenAt = order.updatedAt.getTime();
  return releaseOrder(order, note, (current) => current.updatedAt.getTime() === seenAt);
}

/**
 * Cron cleanup for checkouts that were never released (browser crashed,
 * phone died). Completes any that were actually paid and cancels the rest,
 * so they stop showing as "awaiting payment" forever.
 */
export async function expireStaleCheckouts({ limit = 50, dryRun = false } = {}) {
  const cutoff = new Date(Date.now() - STALE_CHECKOUT_MINUTES * 60 * 1000);
  const stale = await prisma.order.findMany({
    where: { status: "PAYMENT_PENDING", createdAt: { lt: cutoff } },
    select: { id: true, razorpayId: true },
    orderBy: { createdAt: "asc" },
    take: limit,
  });

  const summary = { found: stale.length, expired: 0, completed: 0, waiting: 0, failed: 0 };
  if (dryRun) return summary;

  for (const order of stale) {
    try {
      // Windows that died never removed their tokens, and create-order never
      // reuses a checkout this old, so there's nothing left to protect here.
      const result = await releaseOrder(order, "Checkout expired without payment; ticket released", () => true);
      if (result.released) summary.expired += 1;
      else if (result.reason === "paid") summary.completed += 1;
      else summary.waiting += 1;
    } catch (error) {
      summary.failed += 1;
      console.error(`Failed to expire checkout ${order.id}:`, error);
    }
  }

  return summary;
}
