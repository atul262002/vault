import { OrderStatus, Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { escapeHtml } from "@/lib/mail";
import { sendNotification } from "@/lib/notifications";
import { createNotificationRecord, normalizeOrderStatus, recordOrderStatus } from "@/lib/order-flow";
import { ACTIVE_LISTING_ORDER_STATUSES } from "@/lib/order-availability";
import { createBuyerRefund } from "@/lib/razorpay-money-flow";

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

export async function completeOrderPayment({
  razorpayOrderId,
  razorpayPaymentId,
  source = "client_verify",
}: CompleteOrderPaymentParams) {
  const existingOrder = await fetchOrder(razorpayOrderId);

  if (!existingOrder) {
    return { ok: false as const, status: 404, message: "Order not found" };
  }

  const normalizedStatus = normalizeOrderStatus(existingOrder.status);

  // Idempotency: this exact payment was already captured and the order has
  // moved past PAYMENT_PENDING — nothing left to do.
  if (existingOrder.payment?.paymentId === razorpayPaymentId && normalizedStatus !== "PAYMENT_PENDING") {
    return {
      ok: true as const,
      status: 200,
      message: "Payment already processed",
      orderId: existingOrder.id,
    };
  }

  // A different payment already settled this order and it has moved past
  // PAYMENT_PENDING. The incoming payment is a duplicate charge for the same
  // ticket. Refund it and leave the original payment and the order's
  // progress untouched, instead of overwriting the payment record and
  // resetting the order back to FUNDS_HELD.
  if (
    existingOrder.payment?.paymentId &&
    existingOrder.payment.paymentId !== razorpayPaymentId &&
    normalizedStatus !== "PAYMENT_PENDING"
  ) {
    // Key the refund on the duplicate payment's own id. Reusing the order id
    // would make Razorpay dedupe a later, legitimate refund of the original
    // payment (e.g. buyer cancels) against this one, and a combined
    // order+payment id would exceed Razorpay's 40-character receipt limit.
    const refund = await createBuyerRefund({
      paymentId: razorpayPaymentId,
      amountInRupees: existingOrder.totalAmount,
      orderId: razorpayPaymentId,
    });

    await recordOrderStatus(prisma, {
      orderId: existingOrder.id,
      fromStatus: normalizedStatus,
      toStatus: normalizedStatus,
      note: `Duplicate payment ${razorpayPaymentId} received after payment ${existingOrder.payment.paymentId} already settled. Refund ${refund.id} accepted with status ${refund.status}.`,
    });

    await sendStrayPaymentRefundAlert(
      existingOrder,
      refund.id,
      refund.status,
      "this order had already been paid for, so the second charge was a duplicate"
    );

    return {
      ok: true as const,
      status: 200,
      message: "Duplicate payment refunded automatically",
      orderId: existingOrder.id,
    };
  }

  // The order already resolved through its normal lifecycle (buyer
  // confirmed, auto-confirmed, or was refunded through some other flow). A
  // duplicate/late payment notification for it must not reopen anything.
  if (ALREADY_RESOLVED_STATUSES.includes(normalizedStatus)) {
    return {
      ok: true as const,
      status: 200,
      message: `Order already resolved as ${normalizedStatus}; ignoring late payment notification`,
      orderId: existingOrder.id,
    };
  }

  // The order died before this payment settled — most commonly the buyer
  // cancelled right as Razorpay's capture landed. We can't leave the
  // buyer's money sitting against a dead order, so refund it immediately
  // and leave the order's terminal status untouched.
  if (DEAD_BEFORE_CAPTURE_STATUSES.includes(normalizedStatus)) {
    const refund = await createBuyerRefund({
      paymentId: razorpayPaymentId,
      amountInRupees: existingOrder.totalAmount,
      orderId: existingOrder.id,
    });

    await prisma.$transaction(async (tx) => {
      // Record the captured payment so a webhook retry or status poll for
      // the same payment hits the idempotency guard above instead of
      // issuing a second refund and sending duplicate emails.
      if (!existingOrder.payment) {
        await tx.payment.create({
          data: {
            paymentId: razorpayPaymentId,
            orderId: existingOrder.id,
            status: "COMPLETED",
            amount: existingOrder.totalAmount,
          },
        });
      }

      await recordOrderStatus(tx, {
        orderId: existingOrder.id,
        fromStatus: normalizedStatus,
        toStatus: normalizedStatus,
        note: `Stray payment ${razorpayPaymentId} arrived after the order was already ${normalizedStatus}. Refund ${refund.id} accepted with status ${refund.status}.`,
      });
    });

    await sendStrayPaymentRefundAlert(
      existingOrder,
      refund.id,
      refund.status,
      `this order was already ${normalizedStatus.toLowerCase()} when your payment settled`
    );

    return {
      ok: true as const,
      status: 200,
      message: `Order was already ${normalizedStatus}; stray payment refunded automatically`,
      orderId: existingOrder.id,
    };
  }

  const wasFirstSuccessfulCompletion = !existingOrder.payment;

  const { oversold } = await prisma.$transaction(async (tx) => {
    if (!existingOrder.payment) {
      await tx.payment.create({
        data: {
          paymentId: razorpayPaymentId,
          orderId: existingOrder.id,
          status: "COMPLETED",
          amount: existingOrder.totalAmount,
        },
      });
    } else {
      await tx.payment.update({
        where: { orderId: existingOrder.id },
        data: {
          paymentId: razorpayPaymentId,
          status: "COMPLETED",
          amount: existingOrder.totalAmount,
        },
      });
    }

    if (normalizedStatus === "FUNDS_HELD") {
      return { oversold: false as const };
    }

    // Re-verify, with a row lock, that every product in this order still
    // has an unsold ticket available. A PAYMENT_PENDING order can reach
    // this point well after its 15-minute reservation window lapsed —
    // e.g. a slow bank OTP flow — by which time another buyer may already
    // have claimed the last remaining ticket. This is the last line of
    // defense against double-selling a ticket whose payment settles late.
    for (const item of existingOrder.orderItems) {
      const [lockedProduct] = await tx.$queryRaw<Array<{
        id: string;
        isSold: boolean;
        ticketQuantity: number;
        committedCount: number;
      }>>(Prisma.sql`
        SELECT
          p."id",
          p."isSold",
          p."ticketQuantity",
          (
            SELECT COUNT(*)::int
            FROM "OrderItem" oi
            JOIN "Order" o ON o."id" = oi."orderId"
            WHERE oi."productId" = p."id"
              AND o."id" <> ${existingOrder.id}
              AND o."status" IN (${Prisma.join(
                COMMITTED_ORDER_STATUSES.map((status) => Prisma.sql`${status}::"OrderStatus"`)
              )})
          ) AS "committedCount"
        FROM "Products" p
        WHERE p."id" = ${item.productId}
        FOR UPDATE
      `);

      if (!lockedProduct || lockedProduct.isSold || lockedProduct.committedCount >= lockedProduct.ticketQuantity) {
        return { oversold: true as const };
      }
    }

    await tx.order.update({
      where: { id: existingOrder.id },
      data: {
        status: "FUNDS_HELD",
        transferPendingAt: new Date(),
        lastReminderSentAt: null,
        lastSellerReminderSentAt: null,
        lastBuyerReminderSentAt: null,
      },
    });

    await recordOrderStatus(tx, {
      orderId: existingOrder.id,
      fromStatus: normalizedStatus,
      toStatus: "FUNDS_HELD",
      note: `Payment captured via ${source}`,
    });

    return { oversold: false as const };
  });

  if (oversold) {
    const refund = await createBuyerRefund({
      paymentId: razorpayPaymentId,
      amountInRupees: existingOrder.totalAmount,
      orderId: existingOrder.id,
    });

    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: existingOrder.id },
        data: { status: "REFUNDED" },
      });

      await recordOrderStatus(tx, {
        orderId: existingOrder.id,
        fromStatus: normalizedStatus,
        toStatus: "REFUNDED",
        note: `Listing sold out before this payment settled. Refund ${refund.id} accepted with status ${refund.status}.`,
      });
    });

    await sendStrayPaymentRefundAlert(
      existingOrder,
      refund.id,
      refund.status,
      "the listing sold out to another buyer before your payment settled"
    );

    return {
      ok: true as const,
      status: 200,
      message: "Listing sold out before payment settled; buyer refunded automatically",
      orderId: existingOrder.id,
    };
  }

  if (wasFirstSuccessfulCompletion) {
    const refreshedOrder = await fetchOrder(razorpayOrderId);

    if (refreshedOrder) {
      await sendSellerPaidNotification(refreshedOrder);
    }
  }

  return {
    ok: true as const,
    status: 200,
    message: normalizedStatus === "FUNDS_HELD" ? "Payment already processed" : "Payment captured and seller notified",
    orderId: existingOrder.id,
  };
}

export async function markOrderStatus(
  orderId: string,
  nextStatus: OrderStatus,
  note?: string
) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
  });

  if (!order) {
    return null;
  }

  const currentStatus = normalizeOrderStatus(order.status);

  if (currentStatus === nextStatus) {
    return order;
  }

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: orderId },
      data: { status: nextStatus },
    });

    await recordOrderStatus(tx, {
      orderId,
      fromStatus: currentStatus,
      toStatus: nextStatus,
      note,
    });
  });

  return prisma.order.findUnique({ where: { id: orderId } });
}
