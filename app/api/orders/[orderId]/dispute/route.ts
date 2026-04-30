import { prisma } from "@/lib/db";
import { getOrderPortalUrl } from "@/lib/app-url";
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
        const { disputeReason, buyerCounterEvidenceUrl } = await req.json().catch(() => ({}));

        const order = await prisma.order.findUnique({
            where: { id: orderId }
        });

        if (!order) {
            return NextResponse.json({ message: "Order not found" }, { status: 404 });
        }

        // Verify user is the buyer
        if (order.buyerId !== user.id) {
            return NextResponse.json({ message: "Unauthorized: not the buyer" }, { status: 403 });
        }

        const currentStatus = normalizeOrderStatus(order.status);
        if (currentStatus !== "AWAITING_CONFIRMATION") {
            return NextResponse.json({ message: "Order cannot be disputed in the current state" }, { status: 400 });
        }

        const updatedOrder = await prisma.$transaction(async (tx) => {
            const nextOrder = await tx.order.update({
                where: { id: orderId },
                data: {
                    status: "DISPUTED",
                    disputeReason: disputeReason || "Buyer reported that the transfer was not received.",
                    buyerCounterEvidenceUrl,
                },
                include: {
                    orderItems: {
                        include: { product: true }
                    },
                    buyer: true
                }
            });

            await recordOrderStatus(tx, {
                orderId,
                fromStatus: currentStatus,
                toStatus: "DISPUTED",
                note: disputeReason || "Buyer raised a dispute",
            });

            const sellerId = nextOrder.orderItems[0]?.product.sellerId;
            if (sellerId) {
                await createNotificationRecord(tx, {
                    userId: sellerId,
                    orderId,
                    title: "Dispute raised",
                    message: "Buyer reported that the ticket transfer was not completed. Vault will review the evidence.",
                });
            }

            await tx.dispute.upsert({
                where: { transactionId: orderId },
                update: {
                    status: "ACTIVE",
                    buyerReason: disputeReason || "Buyer reported that the transfer was not received.",
                    buyerEvidenceUrl: buyerCounterEvidenceUrl || null,
                    sellerEvidenceUrl: nextOrder.evidenceUrl || null,
                    openedAt: new Date(),
                    isLocked: false,
                    decisionType: null,
                    adminDecisionReason: null,
                    decidedAt: null,
                    decidedBy: null,
                    resolvedAt: null,
                    messages: [],
                    notificationsLog: [],
                },
                create: {
                    transactionId: orderId,
                    status: "ACTIVE",
                    buyerReason: disputeReason || "Buyer reported that the transfer was not received.",
                    buyerEvidenceUrl: buyerCounterEvidenceUrl || null,
                    sellerEvidenceUrl: nextOrder.evidenceUrl || null,
                    messages: [],
                    notificationsLog: [],
                }
            });

            return nextOrder;
        });

        // Notify Admin/Support
        const ADMIN_EMAIL = "admin@vault.com"; // Hardcoded as requested

        await import("@/lib/mail").then(({ sendMail }) =>
            sendMail({
                to: ADMIN_EMAIL,
                subject: `DISPUTE RAISED: Order #${updatedOrder.id}`,
                html: `
                    <h1>Dispute Raised</h1>
                    <p>The buyer <strong>${updatedOrder.buyer.name}</strong> (${updatedOrder.buyer.email}) has raised a dispute for Order <strong>#${updatedOrder.id}</strong>.</p>
                    <p><strong>Product:</strong> ${updatedOrder.orderItems[0].product.name}</p>
                    <p><strong>Order Amount:</strong> ₹${updatedOrder.totalAmount}</p>
                    <p><strong>Evidence URL:</strong> ${updatedOrder.evidenceUrl || 'Not uploaded'}</p>
                    <p><strong>Buyer reason:</strong> ${updatedOrder.disputeReason || 'Not provided'}</p>
                    <p><strong>Buyer counter evidence:</strong> ${updatedOrder.buyerCounterEvidenceUrl || 'Not provided'}</p>
                    <br/>
                    <p>Please review the evidence and contact both parties.</p>
                    <p><a href="${getOrderPortalUrl(updatedOrder.id)}">Open order in Vault</a></p>
                `
            })
        );

        return NextResponse.json(updatedOrder);

    } catch (error: unknown) {
        console.error("Dispute order error:", error);
        return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
    }
}
