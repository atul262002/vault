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

  const { content, recipient = "BOTH", subject } = await req.json();
  const text = String(content || "").trim();
  const target = String(recipient).toUpperCase();
  const notificationTitle = String(subject || "Admin clarification requested").trim();
  if (!text) {
    return NextResponse.json({ message: "Message content is required" }, { status: 400 });
  }
  if (!["BUYER", "SELLER", "BOTH"].includes(target)) {
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
  messages.push({
    id: crypto.randomUUID(),
    sender: "ADMIN",
    content: `[to:${target}] ${text}`,
    createdAt: new Date().toISOString(),
  });

  const seller = dispute.order.orderItems[0]?.product.seller;
  const notificationsToSend: Array<{
    userId: string;
    email?: string | null;
    phone?: string | null;
    message: string;
  }> = [];

  if (target === "BUYER" || target === "BOTH") {
    notificationsToSend.push({
      userId: dispute.order.buyerId,
      email: dispute.order.buyer.email,
      phone: dispute.order.buyer.phone,
      message: text,
    });
  }
  if ((target === "SELLER" || target === "BOTH") && seller) {
    notificationsToSend.push({
      userId: seller.id,
      email: seller.email,
      phone: seller.phone,
      message: text,
    });
  }

  const notificationsLog = Array.isArray(dispute.notificationsLog) ? [...dispute.notificationsLog] : [];
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

  const updated = await prisma.$transaction(async (tx) => {
    const nextDispute = await tx.dispute.update({
      where: { id: disputeId },
      data: {
        messages: messages as Prisma.JsonArray,
        notificationsLog: notificationsLog as Prisma.JsonArray,
        status: dispute.status === "ACTIVE" ? "UNDER_REVIEW" : dispute.status,
      },
    });

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

    return nextDispute;
  });

  await Promise.all(
    notificationsToSend.map((entry) =>
      sendNotification({
        email: entry.email,
        phone: entry.phone,
        subject: notificationTitle,
        html: `<p>${entry.message}</p>`,
        smsText: `Vault update: ${entry.message}`,
      })
    )
  );

  return NextResponse.json(updated);
}
