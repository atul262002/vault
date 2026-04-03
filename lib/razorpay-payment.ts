import { OrderStatus } from "@prisma/client";

import { prisma } from "@/lib/db";
import { sendNotification } from "@/lib/notifications";
import { createNotificationRecord, normalizeOrderStatus, recordOrderStatus } from "@/lib/order-flow";

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
    subject: `Buyer paid for ${eventName}`,
    html: `
      <h1>Buyer payment secured</h1>
      <p>${message}</p>
      <p><strong>Buyer:</strong> ${buyerName}</p>
      <p><strong>Receiver name:</strong> ${order.receiverName || "Not provided"}</p>
      <p><strong>Receiver phone:</strong> ${order.receiverPhone || "Not provided"}</p>
      <p><strong>Ticket partner:</strong> ${order.orderItems[0]?.product.ticketPartner || "Other"}</p>
      <p><strong>Amount secured:</strong> ₹${order.totalAmount.toFixed(2)}</p>
      <p>Please initiate the transfer within 30 minutes.</p>
    `,
    smsText: `Vault: Buyer paid for ${eventName}. Please transfer within 30 minutes.`,
  });
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

  if (existingOrder.payment?.paymentId === razorpayPaymentId && normalizedStatus === "FUNDS_HELD") {
    return {
      ok: true as const,
      status: 200,
      message: "Payment already processed",
      orderId: existingOrder.id,
    };
  }

  const wasFirstSuccessfulCompletion = !existingOrder.payment;

  await prisma.$transaction(async (tx) => {
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

    if (normalizedStatus !== "FUNDS_HELD") {
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
    }
  });

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
