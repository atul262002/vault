import { OrderStatus, Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { escapeHtml } from "@/lib/mail";
import { sendNotification } from "@/lib/notifications";
import { createNotificationRecord, recordOrderStatus } from "@/lib/order-flow";
import { ACTIVE_LISTING_ORDER_STATUSES } from "@/lib/order-availability";
import { createBuyerRefund } from "@/lib/razorpay-money-flow";
import { withLockedOrder } from "@/lib/order-lock";

// Orders in these statuses never had a payment settle through the normal
// flow (the buyer cancelled, or the order was otherwise abandoned) before
// this capture callback arrived. A payment notification landing after the
// order already reached one of these is a stray/late arrival, not a normal
// completion.
const DEAD_BEFORE_CAPTURE_STATUSES: OrderStatus[] = ["CANCELLED", "FAILED"];

// Orders in these statuses already resolved through the normal flow; a
// duplicate or late payment notification for them should be acknowledged
// without re-running any side effects.
const ALREADY_RESOLVED_STATUSES: OrderStatus[] = [
  "COMPLETE",
  "REFUNDED",
  "SELLER_TIMEOUT",
  "EVIDENCE_TIMEOUT",
];

// Orders that have already had their payment captured and are actively
// holding a ticket slot against the product's remaining ticketQuantity.
// PAYMENT_PENDING is excluded — those orders haven't actually paid yet, so
// they shouldn't count as "committed" when we double-check capacity here.
const COMMITTED_ORDER_STATUSES = ACTIVE_LISTING_ORDER_STATUSES.filter(
  (status) => status !== "PAYMENT_PENDING"
);

type CompleteOrderPaymentParams = {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  source?: "client_verify" | "order_status_poll" | "webhook";
};

function getEventName(order: Awaited<ReturnType<typeof fetchOrder>>) {
  return order?.orderItems[0]?.product.name ?? "your listing";
}

async function fetchOrder(razorpayOrderId: string) {
  return prisma.order.findUnique({
    where: { razorpayId: razorpayOrderId },
    include: {
      orderItems: {
        include: {
          product: {
            include: {
              seller: true,
              category: true,
            },
          },
        },
      },
      buyer: true,
      payment: true,
    },
  });
}

async function sendSellerPaidNotification(order: NonNullable<Awaited<ReturnType<typeof fetchOrder>>>) {
  const seller = order.orderItems[0]?.product.seller;

  if (!seller) {
    return;
  }

  const buyerName = order.buyer.name || "the buyer";
  const eventName = getEventName(order);
  const message = `A buyer has paid for your listing ${eventName}. Please proceed to transfer the ticket.`;

  await createNotificationRecord(prisma, {
    userId: seller.id,
    orderId: order.id,
    title: "Buyer payment received",
    message,
  });

  await sendNotification({
    email: seller.email,
    phone: seller.phone,
    whatsappNumber: seller.whatsappNumber,
    subject: `Buyer paid for ${eventName}`,
    html: `
      <h1>Buyer payment secured</h1>
      <p>${escapeHtml(message)}</p>
      <p><strong>Buyer:</strong> ${escapeHtml(buyerName)}</p>
      <p><strong>Receiver name:</strong> ${escapeHtml(order.receiverName || "Not provided")}</p>
      <p><strong>Receiver phone:</strong> ${escapeHtml(order.receiverPhone || "Not provided")}</p>
      <p><strong>Ticket partner:</strong> ${escapeHtml(order.orderItems[0]?.product.ticketPartner || "Other")}</p>
      <p><strong>Amount secured:</strong> ₹${order.totalAmount.toFixed(2)}</p>
      <p>Please initiate the transfer within 30 minutes.</p>
    `,
    smsText: `Vault: Buyer paid for ${eventName}. Please transfer within 30 minutes.`,
  });
}

async function sendStrayPaymentRefundAlert(
  order: NonNullable<Awaited<ReturnType<typeof fetchOrder>>>,
  refundId: string,
  refundStatus: string,
  reason: string
) {
  const eventName = getEventName(order);

  await createNotificationRecord(prisma, {
    userId: order.buyerId,
    orderId: order.id,
    title: "Payment refunded",
    message: `Your payment for ${eventName} could not be applied (${reason}) and has been refunded.`,
  });

  await import("@/lib/mail").then(({ sendMail, sendAdminMail }) =>
    Promise.allSettled([
      order.buyer.email
        ? sendMail({
            to: order.buyer.email,
            subject: `Refund issued for order ${order.id}`,
            html: `
              <h1>Payment refunded</h1>
              <p>Your payment for <strong>${escapeHtml(eventName)}</strong> could not be applied to order <strong>#${order.id}</strong> because ${reason}.</p>
              <p><strong>Refund ID:</strong> ${refundId}</p>
              <p><strong>Refund Status:</strong> ${refundStatus}</p>
            `,
          })
        : Promise.resolve(null),
      sendAdminMail({
        subject: `[ADMIN] Payment auto-refunded for order ${order.id}`,
        html: `
          <p><strong>Order:</strong> ${order.id}</p>
          <p><strong>Reason:</strong> ${reason}</p>
          <p><strong>Refund:</strong> ${refundId} (${refundStatus})</p>
        `,
      }),
    ])
  );
}

type RazorpayPaymentEntity = {
  id: string;
  order_id: string | null;
  status: string;
  amount: number;
  currency: string;
};

/**
 * Asks Razorpay directly for the payment. Nothing the client sends (or a
 * forwarded webhook body) is trusted for status, order or amount.
 */
async function fetchRazorpayPayment(paymentId: string): Promise<RazorpayPaymentEntity | null> {
  const keyId = process.env.RAZORPAYX_KEY_ID;
  const keySecret = process.env.RAZORPAYX_KEY_SECRET;
  if (!keyId || !keySecret) {
    throw new Error("Razorpay credentials are not configured on the server");
  }
  if (!/^pay_[A-Za-z0-9]+$/.test(paymentId)) {
    return null;
  }

  const response = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}`, {
    headers: {
      Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
    },
  });

  if (response.status === 400 || response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`Razorpay payment lookup failed with status ${response.status}`);
  }
  return (await response.json()) as RazorpayPaymentEntity;
}

type PaymentResult = { ok: boolean; status: number; message: string; orderId?: string };

export async function completeOrderPayment({
  razorpayOrderId,
  razorpayPaymentId,
  source = "client_verify",
}: CompleteOrderPaymentParams): Promise<PaymentResult> {
  const existingOrder = await fetchOrder(razorpayOrderId);
  if (!existingOrder) {
    return { ok: false, status: 404, message: "Order not found" };
  }

  const payment = await fetchRazorpayPayment(razorpayPaymentId);
  if (!payment || payment.order_id !== razorpayOrderId) {
    return { ok: false, status: 400, message: "Payment does not belong to this order" };
  }

  if (payment.status !== "captured") {
    // Authorized-but-not-captured money can still be voided, so it doesn't
    // count as paid yet. The webhook/poll will call again once captured.
    return { ok: false, status: 202, message: "Payment is not captured yet", orderId: existingOrder.id };
  }

  const expectedPaise = Math.round(existingOrder.totalAmount * 100);
  if (payment.currency !== "INR" || Number(payment.amount) !== expectedPaise) {
    console.error(
      `Payment ${payment.id} amount ${payment.amount} ${payment.currency} does not match order ${existingOrder.id} (${expectedPaise} INR)`
    );
    await import("@/lib/mail").then(({ sendAdminMail }) =>
      sendAdminMail({
        subject: `[ADMIN] Payment amount mismatch on order ${existingOrder.id}`,
        html: `<p>Payment ${escapeHtml(payment.id)} captured ${Number(payment.amount) / 100} ${escapeHtml(payment.currency)}, but the order total is ₹${existingOrder.totalAmount}. The order was not marked as paid. Review and refund manually.</p>`,
      })
    );
    return { ok: false, status: 409, message: "Payment amount does not match the order", orderId: existingOrder.id };
  }

  // Everything below runs under the order lock, so the client callback, the
  // status poll and the webhook can't process the same order concurrently,
  // and a cancel can't slip in between our read and our write.
  const { result, afterCommit } = await withLockedOrder(existingOrder.id, async (tx, status) => {
    const order = await tx.order.findUniqueOrThrow({
      where: { id: existingOrder.id },
      include: { payment: true, orderItems: true },
    });

    // 1. This payment was already applied.
    if (order.payment?.paymentId === razorpayPaymentId && status !== "PAYMENT_PENDING") {
      return { result: { ok: true, status: 200, message: "Payment already processed", orderId: order.id } };
    }

    // 2. A different payment already settled this order: duplicate charge.
    if (order.payment?.paymentId && order.payment.paymentId !== razorpayPaymentId && status !== "PAYMENT_PENDING") {
      // Keyed on the duplicate payment id so it can't collide with a later,
      // legitimate refund of the original payment.
      const refund = await createBuyerRefund({
        paymentId: razorpayPaymentId,
        amountInRupees: order.totalAmount,
        orderId: razorpayPaymentId,
      });
      await recordOrderStatus(tx, {
        orderId: order.id,
        fromStatus: status,
        toStatus: status,
        note: `Duplicate payment ${razorpayPaymentId} refunded (${refund.id}, ${refund.status}); payment ${order.payment.paymentId} had already settled this order.`,
      });
      return {
        result: { ok: true, status: 200, message: "Duplicate payment refunded automatically", orderId: order.id },
        afterCommit: () =>
          sendStrayPaymentRefundAlert(existingOrder, refund.id, refund.status, "this order had already been paid for, so the second charge was a duplicate"),
      };
    }

    // 3. Order already finished its lifecycle.
    if (ALREADY_RESOLVED_STATUSES.includes(status)) {
      return { result: { ok: true, status: 200, message: `Order already resolved as ${status}`, orderId: order.id } };
    }

    // 4. Order died before the payment landed (e.g. buyer cancelled).
    if (DEAD_BEFORE_CAPTURE_STATUSES.includes(status)) {
      const refund = await createBuyerRefund({
        paymentId: razorpayPaymentId,
        amountInRupees: order.totalAmount,
        orderId: order.id,
      });
      if (!order.payment) {
        await tx.payment.create({
          data: { paymentId: razorpayPaymentId, orderId: order.id, status: "COMPLETED", amount: order.totalAmount },
        });
      }
      await recordOrderStatus(tx, {
        orderId: order.id,
        fromStatus: status,
        toStatus: status,
        note: `Payment ${razorpayPaymentId} arrived after the order was ${status}. Refund ${refund.id} (${refund.status}).`,
      });
      return {
        result: { ok: true, status: 200, message: `Order was already ${status}; payment refunded automatically`, orderId: order.id },
        afterCommit: () =>
          sendStrayPaymentRefundAlert(existingOrder, refund.id, refund.status, `this order was already ${status.toLowerCase()} when your payment settled`),
      };
    }

    // 5. Normal capture. Record the payment first.
    if (order.payment) {
      await tx.payment.update({
        where: { orderId: order.id },
        data: { paymentId: razorpayPaymentId, status: "COMPLETED", amount: order.totalAmount },
      });
    } else {
      await tx.payment.create({
        data: { paymentId: razorpayPaymentId, orderId: order.id, status: "COMPLETED", amount: order.totalAmount },
      });
    }

    if (status !== "PAYMENT_PENDING") {
      // Unreachable in normal operation; keep the money recorded and flag it.
      return {
        result: { ok: true, status: 200, message: `Payment recorded; order is ${status}`, orderId: order.id },
        afterCommit: () =>
          import("@/lib/mail").then(({ sendAdminMail }) =>
            sendAdminMail({
              subject: `[ADMIN] Unexpected payment on order ${order.id}`,
              html: `<p>Payment ${escapeHtml(razorpayPaymentId)} was captured while the order was ${status}. Review it manually.</p>`,
            })
          ),
      };
    }

    // Re-check stock under a product lock: this payment may have settled
    // after its 15-minute reservation lapsed and someone else bought the
    // last ticket in the meantime.
    for (const item of order.orderItems) {
      const [product] = await tx.$queryRaw<Array<{ isSold: boolean; ticketQuantity: number; committedCount: number }>>(Prisma.sql`
        SELECT
          p."isSold",
          p."ticketQuantity",
          (
            SELECT COUNT(*)::int
            FROM "OrderItem" oi
            JOIN "Order" o ON o."id" = oi."orderId"
            WHERE oi."productId" = p."id"
              AND o."id" <> ${order.id}
              AND o."status" IN (${Prisma.join(COMMITTED_ORDER_STATUSES.map((s) => Prisma.sql`${s}::"OrderStatus"`))})
          ) AS "committedCount"
        FROM "Products" p
        WHERE p."id" = ${item.productId}
        FOR UPDATE
      `);

      if (!product || product.isSold || product.committedCount >= product.ticketQuantity) {
        const refund = await createBuyerRefund({
          paymentId: razorpayPaymentId,
          amountInRupees: order.totalAmount,
          orderId: order.id,
        });
        await tx.order.update({ where: { id: order.id }, data: { status: "REFUNDED" } });
        await recordOrderStatus(tx, {
          orderId: order.id,
          fromStatus: status,
          toStatus: "REFUNDED",
          note: `Listing sold out before this payment settled. Refund ${refund.id} (${refund.status}).`,
        });
        return {
          result: { ok: true, status: 200, message: "Listing sold out before payment settled; buyer refunded automatically", orderId: order.id },
          afterCommit: () =>
            sendStrayPaymentRefundAlert(existingOrder, refund.id, refund.status, "the listing sold out to another buyer before your payment settled"),
        };
      }
    }

    await tx.order.update({
      where: { id: order.id },
      data: {
        status: "FUNDS_HELD",
        transferPendingAt: new Date(),
        lastReminderSentAt: null,
        lastSellerReminderSentAt: null,
        lastBuyerReminderSentAt: null,
      },
    });
    await recordOrderStatus(tx, {
      orderId: order.id,
      fromStatus: status,
      toStatus: "FUNDS_HELD",
      note: `Payment captured via ${source}`,
    });

    return {
      result: { ok: true, status: 200, message: "Payment captured and seller notified", orderId: order.id },
      afterCommit: async () => {
        const refreshed = await fetchOrder(razorpayOrderId);
        if (refreshed) await sendSellerPaidNotification(refreshed);
      },
    };
  });

  if (afterCommit) {
    // Notifications must never turn a committed payment into an error response.
    await Promise.resolve(afterCommit()).catch((error) => console.error("Post-payment notification failed:", error));
  }

  return result;
}
