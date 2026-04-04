import { prisma } from "@/lib/db";
import { getOrderPortalUrl } from "@/lib/app-url";
import { getCurrentDbUser } from "@/lib/current-db-user";
import { createNotificationRecord, normalizeOrderStatus, recordOrderStatus } from "@/lib/order-flow";
import { createBuyerRefund } from "@/lib/razorpay-money-flow";
import { NextRequest, NextResponse } from "next/server";

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

    const currentStatus = normalizeOrderStatus(order.status);
    if (!["PAYMENT_PENDING", "FUNDS_HELD", "TRANSFER_PENDING"].includes(currentStatus)) {
      return NextResponse.json(
        { message: "This order can no longer be cancelled from the buyer side" },
        { status: 400 }
      );
    }

    const seller = order.orderItems[0]?.product.seller;
    const orderPortalUrl = getOrderPortalUrl(order.id);
    let refundId: string | null = null;
    let refundStatus: string | null = null;

    if (order.payment?.paymentId) {
      const refund = await createBuyerRefund({
        paymentId: order.payment.paymentId,
        amountInRupees: order.totalAmount,
        orderId,
      });

      refundId = refund.id;
      refundStatus = refund.status;
    }

    const updatedOrder = await prisma.$transaction(async (tx) => {
      const nextOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          status: refundId ? "REFUNDED" : "CANCELLED",
        },
        include: {
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
          buyer: true,
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

      return nextOrder;
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

    return NextResponse.json(updatedOrder);
  } catch (error: unknown) {
    console.error("Cancel order error:", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
