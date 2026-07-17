import { requireAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { sendNotification } from "@/lib/notifications";
import { createNotificationRecord } from "@/lib/order-flow";
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ disputeId: string }> }
) {
  const admin = await requireAdminSession();
  if (!admin) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { content, recipient = "BOTH", subject, sender = "ADMIN" } = await req.json();
  const text = String(content || "").trim();
  const target = String(recipient).toUpperCase();
  const senderLabel = (["ADMIN", "BUYER", "SELLER"].includes(String(sender).toUpperCase())
    ? String(sender).toUpperCase()
    : "ADMIN") as "ADMIN" | "BUYER" | "SELLER";
  const notificationTitle = String(subject || "Admin clarification requested").trim();
  if (!text) {
    return NextResponse.json({ message: "Message content is required" }, { status: 400 });
  }
  if (!notificationTitle) {
    return NextResponse.json({ message: "Subject is required" }, { status: 400 });
  }
  // Only validate recipient target when admin is sending (buyer/seller entries don't notify)
  if (senderLabel === "ADMIN" && !["BUYER", "SELLER", "BOTH"].includes(target)) {
    return NextResponse.json({ message: "Invalid recipient target" }, { status: 400 });
  }

  const { disputeId } = await params;
  const dispute = await prisma.dispute.findUnique({
    where: { id: disputeId },
    include: {
      order: {
        include: {
          buyer: true,
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
      },
    },
  });
  if (!dispute) {
    return NextResponse.json({ message: "Dispute not found" }, { status: 404 });
  }
  if (dispute.isLocked) {
    return NextResponse.json({ message: "Cannot message on resolved disputes" }, { status: 400 });
  }

  const messages = Array.isArray(dispute.messages) ? [...dispute.messages] : [];
  // For BUYER/SELLER logged replies, no recipient prefix needed — they're just thread entries
  const contentWithTarget = senderLabel === "ADMIN" ? `[to:${target}] ${text}` : text;
  messages.push({
    id: crypto.randomUUID(),
    sender: senderLabel,
    content: contentWithTarget,
    createdAt: new Date().toISOString(),
  });

  // Only send notifications outward when admin is sending
  const seller = dispute.order.orderItems[0]?.product.seller;
  const notificationsToSend: Array<{
    userId: string;
    email?: string | null;
    phone?: string | null;
    whatsappNumber?: string | null;
    message: string;
  }> = [];

  if (senderLabel === "ADMIN") {
    if (target === "BUYER" || target === "BOTH") {
      notificationsToSend.push({
        userId: dispute.order.buyerId,
        email: dispute.order.buyer.email,
        phone: dispute.order.buyer.phone,
        whatsappNumber: dispute.order.buyer.whatsappNumber,
        message: text,
      });
    }
    if ((target === "SELLER" || target === "BOTH") && seller) {
      notificationsToSend.push({
        userId: seller.id,
        email: seller.email,
        phone: seller.phone,
        whatsappNumber: seller.whatsappNumber,
        message: text,
      });
    }
    if ((target === "SELLER" || target === "BOTH") && !seller) {
      return NextResponse.json({ message: "Seller not found for this dispute" }, { status: 400 });
    }
    if (notificationsToSend.length === 0) {
      return NextResponse.json({ message: "No recipient available for this message" }, { status: 400 });
    }
  }

  const notificationsLog = Array.isArray(dispute.notificationsLog) ? [...dispute.notificationsLog] : [];
  if (notificationsToSend.length > 0) {
    const timestamp = new Date().toISOString();
    notificationsLog.push(
      ...notificationsToSend.map((entry) => ({
        id: crypto.randomUUID(),
        toUserId: entry.userId,
        title: notificationTitle,
        message: entry.message,
        createdAt: timestamp,
      }))
    );
  }

  const updated = await prisma.$transaction(async (tx) => {
    const nextDispute = await tx.dispute.update({
      where: { id: disputeId },
      data: {
        messages: messages as Prisma.JsonArray,
        notificationsLog: notificationsLog as Prisma.JsonArray,
        status: dispute.status === "ACTIVE" && senderLabel === "ADMIN" ? "UNDER_REVIEW" : dispute.status,
      },
    });

    if (notificationsToSend.length > 0) {
      await Promise.all(
        notificationsToSend.map((entry) =>
          createNotificationRecord(tx, {
            userId: entry.userId,
            orderId: dispute.transactionId,
            title: notificationTitle,
            message: entry.message,
          })
        )
      );
    }

    return nextDispute;
  });

  const deliveryResults = await Promise.allSettled(
    notificationsToSend.map((entry) =>
      sendNotification({
        email: entry.email,
        phone: entry.phone,
        whatsappNumber: entry.whatsappNumber,
        subject: notificationTitle,
        html: `<p>${entry.message}</p>`,
        smsText: `Vault update: ${entry.message}`,
      })
    )
  );

  const failedDeliveries = deliveryResults.filter((result) => result.status === "rejected").length;
  return NextResponse.json({
    ...updated,
    notificationDelivery: {
      attempted: notificationsToSend.length,
      failed: failedDeliveries,
    },
  });
}
