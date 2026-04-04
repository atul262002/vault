import { prisma } from "@/lib/db";
import { getOrderPortalUrl } from "@/lib/app-url";
import { getCurrentDbUser } from "@/lib/current-db-user";
import { createNotificationRecord, getTransferDelayUntil, normalizeOrderStatus, recordOrderStatus } from "@/lib/order-flow";
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
                orderItems: {
                    include: {
                        product: {
                            include: {
                                seller: true,
                            }
                        }
                    }
                },
                buyer: true,
            }
        });

        if (!order) {
            return NextResponse.json({ message: "Order not found" }, { status: 404 });
        }

        // Verify user is the seller of the product(s)
        // Assuming all items in order belong to same seller or we just check one
        const sellerId = order.orderItems[0].product.sellerId;
        if (sellerId !== user.id) {
            return NextResponse.json({ message: "Unauthorized: not the seller" }, { status: 403 });
        }

        const currentStatus = normalizeOrderStatus(order.status);
        if (!["FUNDS_HELD", "TRANSFER_PENDING"].includes(currentStatus)) {
            return NextResponse.json({ message: "Transfer cannot be initiated in the current state" }, { status: 400 });
        }

        const now = new Date();
        const transferDelayUntil = getTransferDelayUntil(now);

        const updatedOrder = await prisma.$transaction(async (tx) => {
            const nextOrder = await tx.order.update({
                where: { id: orderId },
                data: {
                    status: "TRANSFER_IN_PROGRESS",
                    transferStartedAt: now,
                    transferDelayUntil,
                },
                include: { buyer: true }
            });

            await recordOrderStatus(tx, {
                orderId,
                fromStatus: currentStatus,
                toStatus: "TRANSFER_IN_PROGRESS",
                note: "Seller initiated ticket transfer",
            });

            await createNotificationRecord(tx, {
                userId: order.buyerId,
                orderId,
                title: "Seller initiated transfer",
                message: "Seller has initiated the ticket transfer. This update will become visible in your buyer flow after 5 minutes.",
            });

            return nextOrder;
        });

        if (updatedOrder.buyer.email) {
            const orderPortalUrl = getOrderPortalUrl(updatedOrder.id);
            await import("@/lib/mail").then(({ sendMail }) =>
                sendMail({
                    to: updatedOrder.buyer.email!,
                    subject: `Transfer Initiated: Order #${updatedOrder.id}`,
                    html: `
                        <h1>Seller has initiated the ticket transfer</h1>
                        <p>The seller for your order <strong>#${updatedOrder.id}</strong> has started the transfer process.</p>
                        <p>This status will appear in your buyer flow after a 5-minute delay, then you will be able to track the remaining transfer window.</p>
                        <p><a href="${orderPortalUrl}">Open order in Vault</a></p>
                    `
                })
            );
        }

        return NextResponse.json(updatedOrder);

    } catch (error: unknown) {
        console.error("Initiate transfer error:", error);
        return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
    }
}
