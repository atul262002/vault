import { requireAdminSession } from "@/lib/admin-auth";
import { createBuyerRefund, createSellerPayout } from "@/lib/razorpay-money-flow";
import { prisma } from "@/lib/db";
import { sendNotification } from "@/lib/notifications";
import { createNotificationRecord, normalizeOrderStatus, recordOrderStatus } from "@/lib/order-flow";
import { DisputeDecisionType, DisputeStatus, Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ disputeId: string }> }
) {
  const admin = await requireAdminSession();
  if (!admin) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const decisionType = body?.decisionType as DisputeDecisionType;
  const reason = String(body?.reason || "").trim();
  if (!Object.values(DisputeDecisionType).includes(decisionType)) {
    return NextResponse.json({ message: "Invalid decision type" }, { status: 400 });
  }
  if (reason.length < 10) {
    return NextResponse.json({ message: "Decision reason must be at least 10 characters" }, { status: 400 });
  }

  const { disputeId } = await params;
  const dispute = await prisma.dispute.findUnique({
    where: { id: disputeId },
    include: {
      order: {
        include: {
          payment: true,
          buyer: true,
          orderItems: {
            include: { product: { include: { seller: true } } },
          },
        },
      },
    },
  });
  if (!dispute) {
    return NextResponse.json({ message: "Dispute not found" }, { status: 404 });
  }
  if (dispute.isLocked || dispute.status === DisputeStatus.RESOLVED || dispute.decisionType) {
    return NextResponse.json({ message: "Dispute is already resolved and locked" }, { status: 400 });
  }

  const order = dispute.order;
  const seller = order.orderItems[0]?.product.seller;
  if (!seller) {
    return NextResponse.json({ message: "Seller not found for order" }, { status: 400 });
  }

  const buyerName = order.buyer.name || "Buyer";
  const sellerName = seller.name || "Seller";
  const amount = order.totalAmount;
  const sellerGross = order.orderItems.reduce((sum, item) => sum + item.price, 0);
  const sellerNetPayout = Math.max(0, sellerGross - (order.platformFeeSeller || 0));

  if (decisionType === "REFUND" && !order.payment?.paymentId) {
    return NextResponse.json({ message: "Payment record not found for refund" }, { status: 400 });
  }
  if (decisionType === "CREDIT" && !seller.fundAccountId) {
    return NextResponse.json({ message: "Seller fund account is missing for payout" }, { status: 400 });
  }

  try {
    if (decisionType === "REFUND") {
      await createBuyerRefund({
        paymentId: order.payment!.paymentId,
        amountInRupees: amount,
        orderId: order.id,
      });
    } else {
      await createSellerPayout({
        fundAccountId: seller.fundAccountId!,
        amountInRupees: sellerNetPayout,
        orderId: order.id,
      });
    }
  } catch (moneyErr: unknown) {
    const description =
      moneyErr instanceof Error ? moneyErr.message : "Payment provider returned an error";
    console.error(`[decision/${disputeId}] ${decisionType} failed:`, moneyErr);
    return NextResponse.json(
      { message: `${decisionType === "REFUND" ? "Refund" : "Payout"} failed: ${description}` },
      { status: 502 }
    );
  }

  const buyerMsg =
    decisionType === "REFUND"
      ? `Your dispute has been reviewed. A refund of ₹${amount.toFixed(2)} has been initiated to your original payment method. Please allow 5–7 business days.`
      : `Upon careful review of evidence submitted by both parties, you have forfeited the dispute. Payment of ₹${sellerNetPayout.toFixed(2)} will be processed to seller (${sellerName}).`;
  const sellerMsg =
    decisionType === "CREDIT"
      ? `Your dispute has been reviewed. Payment of ₹${sellerNetPayout.toFixed(2)} will be credited to your bank account within 24–48 hours.`
      : `Upon careful review of evidence submitted by both parties, you have forfeited the dispute. Payment of ₹${amount.toFixed(2)} will be refunded to buyer (${buyerName}).`;

  const nowIso = new Date().toISOString();

  const updated = await prisma.$transaction(async (tx) => {
    const notificationsLog = Array.isArray(dispute.notificationsLog)
      ? [...dispute.notificationsLog]
      : [];
    notificationsLog.push(
      {
        id: crypto.randomUUID(),
        toUserId: order.buyerId,
        title: "Dispute outcome",
        message: buyerMsg,
        createdAt: nowIso,
      },
      {
        id: crypto.randomUUID(),
        toUserId: seller.id,
        title: "Dispute outcome",
        message: sellerMsg,
        createdAt: nowIso,
      }
    );

    const nextDispute = await tx.dispute.update({
      where: { id: disputeId },
      data: {
        status: DisputeStatus.RESOLVED,
        decisionType,
        adminDecisionReason: reason,
        decidedBy: admin.username,
        decidedAt: new Date(),
        resolvedAt: new Date(),
        isLocked: true,
        notificationsLog: notificationsLog as Prisma.JsonArray,
      },
    });

    await createNotificationRecord(tx, {
      userId: order.buyerId,
      orderId: order.id,
      title: "Dispute outcome",
      message: buyerMsg,
    });
    await createNotificationRecord(tx, {
      userId: seller.id,
      orderId: order.id,
      title: "Dispute outcome",
      message: sellerMsg,
    });

    const currentOrderStatus = normalizeOrderStatus(order.status);
    const nextOrderStatus = decisionType === "REFUND" ? "REFUNDED" : "COMPLETE";
    if (currentOrderStatus !== nextOrderStatus) {
      await tx.order.update({
        where: { id: order.id },
        data: { status: nextOrderStatus },
      });
      await recordOrderStatus(tx, {
        orderId: order.id,
        fromStatus: currentOrderStatus,
        toStatus: nextOrderStatus,
        note: `Admin dispute decision: ${decisionType}. ${reason}`,
      });
    }

    return nextDispute;
  });

  const deliveryResults = await Promise.allSettled([
    sendNotification({
      email: order.buyer.email,
      phone: order.buyer.phone,
      whatsappNumber: order.buyer.whatsappNumber,
      subject: `Dispute outcome for order ${order.id}`,
      html: `<p>${buyerMsg}</p><p><strong>Admin decision note:</strong> ${reason}</p>`,
      smsText: `Vault dispute result: ${buyerMsg}`,
    }),
    sendNotification({
      email: seller.email,
      phone: seller.phone,
      whatsappNumber: seller.whatsappNumber,
      subject: `Dispute outcome for order ${order.id}`,
      html: `<p>${sellerMsg}</p><p><strong>Admin decision note:</strong> ${reason}</p>`,
      smsText: `Vault dispute result: ${sellerMsg}`,
    }),
  ]);

  const failedDeliveries = deliveryResults.filter((result) => result.status === "rejected").length;
  return NextResponse.json({
    ...updated,
    notificationDelivery: {
      attempted: deliveryResults.length,
      failed: failedDeliveries,
    },
  });
}
