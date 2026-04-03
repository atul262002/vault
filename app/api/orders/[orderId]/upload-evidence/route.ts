import { prisma } from "@/lib/db";
import { getCurrentDbUser } from "@/lib/current-db-user";
import { createNotificationRecord, normalizeOrderStatus, recordOrderStatus } from "@/lib/order-flow";
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
        const { evidenceUrl } = await req.json();

        if (!evidenceUrl) {
            return NextResponse.json({ message: "Evidence URL required" }, { status: 400 });
        }

        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: { orderItems: { include: { product: true } } }
        });

        if (!order) {
            return NextResponse.json({ message: "Order not found" }, { status: 404 });
        }

        // Verify user is the seller
        const sellerId = order.orderItems[0].product.sellerId;
        if (sellerId !== user.id) {
            return NextResponse.json({ message: "Unauthorized: not the seller" }, { status: 403 });
        }

        const currentStatus = normalizeOrderStatus(order.status);
        if (currentStatus !== "TRANSFER_IN_PROGRESS") {
            return NextResponse.json({ message: "Evidence can only be uploaded after transfer is initiated" }, { status: 400 });
        }

        const now = new Date();

        const updatedOrder = await prisma.$transaction(async (tx) => {
            const nextOrder = await tx.order.update({
                where: { id: orderId },
                data: {
                    status: "AWAITING_CONFIRMATION",
                    evidenceUrl,
                    evidenceUploadedAt: now,
                    lastBuyerReminderSentAt: null
                },
                include: { buyer: true }
            });

            await recordOrderStatus(tx, {
                orderId,
                fromStatus: currentStatus,
                toStatus: "AWAITING_CONFIRMATION",
                note: "Seller uploaded transfer evidence",
            });

            await createNotificationRecord(tx, {
                userId: order.buyerId,
                orderId,
                title: "Transfer evidence uploaded",
                message: "Seller uploaded transfer evidence. Please confirm receipt within 10 minutes or the order will auto-complete.",
            });

            return nextOrder;
        });

        if (updatedOrder.buyer.email) {
            await import("@/lib/mail").then(({ sendMail }) =>
                sendMail({
                    to: updatedOrder.buyer.email!,
                    subject: `Evidence Uploaded: Action Required for Order #${updatedOrder.id}`,
                    html: `
                        <h1>Seller has uploaded transfer evidence!</h1>
                        <p>The seller for your order <strong>#${updatedOrder.id}</strong> has uploaded proof of ticket transfer.</p>
                        <p><a href="${updatedOrder.evidenceUrl}">Click here to view the evidence</a></p>
                        <p>Please review it and confirm receipt within <strong>10 minutes</strong>. If you do not respond, the transaction will auto-complete and payout will be triggered.</p>
                    `
                })
            );
        }

        return NextResponse.json(updatedOrder);

    } catch (error: unknown) {
        console.error("Upload evidence error:", error);
        return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
    }
}
