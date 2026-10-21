import { prisma } from "@/lib/db";
import { getOrderPortalUrl } from "@/lib/app-url";
import { getCurrentDbUser } from "@/lib/current-db-user";
import { createNotificationRecord, recordOrderStatus } from "@/lib/order-flow";
import { OrderActionError, requireStatus, withLockedOrder } from "@/lib/order-lock";
import { releaseUnpaidCheckout } from "@/lib/checkout-release";
import { createBuyerRefund } from "@/lib/razorpay-money-flow";
import { NextRequest, NextResponse } from "next/server";

// Same shape as GET /api/orders/[orderId], so the order page can render the result.
function loadOrderForClient(id: string) {
  return prisma.order.findUnique({
    where: { id },
    include: {
            orderItems: {
              include: {
                product: {
                  include: { category: true, seller: { select: { id: true, name: true, email: true } } },
                },
              },
            },
            buyer: { select: { id: true, name: true, email: true } },
            payment: true,
            statusHistory: { orderBy: { createdAt: "asc" } },
          },
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const user = await getCurrentDbUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { orderId } = await params;
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        buyer: true,
        payment: true,
        orderItems: {
          include: {
            product: {
              include: {
                seller: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ message: "Order not found" }, { status: 404 });
    }

    if (order.buyerId !== user.id) {
      return NextResponse.json({ message: "Only the buyer can cancel this order" }, { status: 403 });
    }

    // An unpaid checkout is cancelled through the same Razorpay-checked path
    // as closing the payment window: if the buyer's payment is in progress
    // or already captured, cancelling must not race it.
    if (order.status === "PAYMENT_PENDING" && !order.payment) {
      const result = await releaseUnpaidCheckout({
        razorpayOrderId: order.razorpayId,
        buyerId: user.id,
        reason: "buyer cancelled",
        wholeCheckout: true,
      });
      if (result.released) {
        return NextResponse.json(await loadOrderForClient(order.id));
      }
      const messages: Record<string, string> = {
        paid: "Your payment went through, so this order is now active instead of cancelled.",
        payment_in_progress: "A payment for this order is still processing. Please wait a minute and try again.",
        unverified: "We couldn't confirm the payment status right now. Please try again shortly.",
      };
      if (result.reason in messages) {
        return NextResponse.json({ message: messages[result.reason] }, { status: 409 });
      }
      // not_pending: the order moved on in the meantime; fall through to the normal checks.
    }

    const seller = order.orderItems[0]?.product.seller;
    const orderPortalUrl = getOrderPortalUrl(order.id);

    // Locked so a cancel can't race the payment webhook (money captured but
    // never refunded) or the seller starting the transfer.
    const { refundId, refundStatus } = await withLockedOrder(orderId, async (tx, currentStatus) => {
      requireStatus(
        currentStatus,
        ["PAYMENT_PENDING", "FUNDS_HELD", "TRANSFER_PENDING"],
        "This order can no longer be cancelled from the buyer side"
      );

      const payment = await tx.payment.findUnique({ where: { orderId } });
      let refundId: string | null = null;
      let refundStatus: string | null = null;

      if (payment?.paymentId) {
        const refund = await createBuyerRefund({
          paymentId: payment.paymentId,
          amountInRupees: order.totalAmount,
          orderId,
        });
        refundId = refund.id;
        refundStatus = refund.status;
      }

      const nextOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          status: refundId ? "REFUNDED" : "CANCELLED",
        },
      });

      await recordOrderStatus(tx, {
        orderId,
        fromStatus: currentStatus,
        toStatus: refundId ? "REFUNDED" : "CANCELLED",
        note: refundId
          ? `Buyer cancelled order before seller transfer. Refund ${refundId} accepted with status ${refundStatus}.`
          : "Buyer cancelled order before payment capture.",
      });

      if (seller?.id) {
        await createNotificationRecord(tx, {
          userId: seller.id,
          orderId,
          title: "Order cancelled by buyer",
          message: "Buyer cancelled the order before transfer started.",
        });
      }

      await createNotificationRecord(tx, {
        userId: order.buyerId,
        orderId,
        title: refundId ? "Refund initiated" : "Order cancelled",
        message: refundId
          ? "Your cancellation was accepted and your refund has been initiated."
          : "Your order was cancelled before payment capture.",
      });

      return { updatedOrder: nextOrder, refundId, refundStatus };
    });

    await import("@/lib/mail").then(({ sendMail }) =>
      Promise.allSettled([
        order.buyer.email
          ? sendMail({
              to: order.buyer.email,
              subject: `Order cancelled: ${order.id}`,
              html: `
                <h1>Order cancelled</h1>
                <p>Your cancellation request has been processed.</p>
                ${refundId ? `<p><strong>Refund ID:</strong> ${refundId}</p><p><strong>Refund Status:</strong> ${refundStatus}</p>` : `<p>No captured payment was found, so no refund was needed.</p>`}
                <p><a href="${orderPortalUrl}">Open order in Vault</a></p>
              `,
            })
          : Promise.resolve(null),
        seller?.email
          ? sendMail({
              to: seller.email,
              subject: `Buyer cancelled order: ${order.id}`,
              html: `
                <h1>Buyer cancelled the order</h1>
                <p>The buyer cancelled this order before seller transfer started.</p>
                <p><a href="${orderPortalUrl}">Open order in Vault</a></p>
              `,
            })
          : Promise.resolve(null),
      ])
    );

    return NextResponse.json(await loadOrderForClient(orderId));
  } catch (error: unknown) {
    if (error instanceof OrderActionError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    console.error("Cancel order error:", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
