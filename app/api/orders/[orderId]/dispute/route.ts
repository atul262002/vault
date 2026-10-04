import { isAllowedEvidenceUrl } from "@/lib/evidence-url";
import { prisma } from "@/lib/db";
import { getOrderPortalUrl } from "@/lib/app-url";
import { getCurrentDbUser } from "@/lib/current-db-user";
import { createNotificationRecord, recordOrderStatus } from "@/lib/order-flow";
import { OrderActionError, requireStatus, withLockedOrder } from "@/lib/order-lock";
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
        const body = await req.json().catch(() => ({}));
        const disputeReason = typeof body?.disputeReason === "string" ? body.disputeReason.trim().slice(0, 2000) : "";
        const buyerCounterEvidenceUrl = body?.buyerCounterEvidenceUrl || null;

        if (buyerCounterEvidenceUrl !== null && !isAllowedEvidenceUrl(buyerCounterEvidenceUrl)) {
            return NextResponse.json({ message: "Please upload the evidence file through Vault" }, { status: 400 });
        }

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


        const updatedOrder = await withLockedOrder(orderId, async (tx, currentStatus) => {
            requireStatus(currentStatus, ["AWAITING_CONFIRMATION"], "Order cannot be disputed in the current state");

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
        await import("@/lib/mail").then(({ sendAdminMail, escapeHtml }) =>
            sendAdminMail({
                subject: `DISPUTE RAISED: Order #${updatedOrder.id}`,
                html: `
                    <h1>Dispute Raised</h1>
                    <p>The buyer <strong>${escapeHtml(updatedOrder.buyer.name)}</strong> (${escapeHtml(updatedOrder.buyer.email)}) has raised a dispute for Order <strong>#${updatedOrder.id}</strong>.</p>
                    <p><strong>Product:</strong> ${escapeHtml(updatedOrder.orderItems[0].product.name)}</p>
                    <p><strong>Order Amount:</strong> ₹${updatedOrder.totalAmount}</p>
                    <p><strong>Evidence URL:</strong> ${escapeHtml(updatedOrder.evidenceUrl || 'Not uploaded')}</p>
                    <p><strong>Buyer reason:</strong> ${escapeHtml(updatedOrder.disputeReason || 'Not provided')}</p>
                    <p><strong>Buyer counter evidence:</strong> ${escapeHtml(updatedOrder.buyerCounterEvidenceUrl || 'Not provided')}</p>
                    <br/>
                    <p>Please review the evidence and contact both parties.</p>
                    <p><a href="${getOrderPortalUrl(updatedOrder.id)}">Open order in Vault</a></p>
                `
            })
        );

        return NextResponse.json(updatedOrder);

    } catch (error: unknown) {
        if (error instanceof OrderActionError) {
            return NextResponse.json({ message: error.message }, { status: error.status });
        }
        console.error("Dispute order error:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
