import { prisma } from "@/lib/db";
import { BUYER_AUTO_CONFIRM_MINUTES, EVIDENCE_TIMEOUT_MINUTES, SELLER_TIMEOUT_MINUTES, normalizeOrderStatus, recordOrderStatus } from "@/lib/order-flow";
import { createBuyerRefund, createSellerPayout } from "@/lib/razorpay-money-flow";
import { currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ orderId: string }> }
) {
    try {
        const user = await currentUser();
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
                            include: { seller: true }
                        }
                    }
                }
            }
        });

        if (!order) {
            return NextResponse.json({ message: "Order not found" }, { status: 404 });
        }

        const isBuyer = order.buyerId === user.id;
        const seller = order.orderItems[0]?.product.seller;
        const isSeller = seller?.id === user.id;

        if (!isBuyer && !isSeller) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
        }

        const now = new Date().getTime();
        const ADMIN_EMAIL = "writeatul2002@gmail.com";

        const normalizedStatus = normalizeOrderStatus(order.status);

        // SCENARIO 1: Seller did not initiate transfer within 30 minutes after funds were held.
        if (normalizedStatus === "FUNDS_HELD" && order.transferPendingAt) {
            const transferDeadline = new Date(order.transferPendingAt).getTime() + SELLER_TIMEOUT_MINUTES * 60000;

            if (now > transferDeadline) {
                if (!isBuyer) {
                    return NextResponse.json({ message: "Only Buyer can claim refund for transfer timeout" }, { status: 403 });
                }

                if (!order.payment?.paymentId) {
                    return NextResponse.json({ message: "Captured payment record not found for this order" }, { status: 400 });
                }

                const refund = await createBuyerRefund({
                    paymentId: order.payment.paymentId,
                    amountInRupees: order.totalAmount,
                    orderId,
                });

                const updatedOrder = await prisma.$transaction(async (tx) => {
                    const nextOrder = await tx.order.update({
                        where: { id: orderId },
                        data: { status: "SELLER_TIMEOUT" }
                    });

                    await recordOrderStatus(tx, {
                        orderId,
                        fromStatus: normalizedStatus,
                        toStatus: "SELLER_TIMEOUT",
                        note: `Buyer claimed seller initiation timeout. Refund ${refund.id} accepted with status ${refund.status}.`,
                    });

                    return nextOrder;
                });

                // Notify
                await import("@/lib/mail").then(({ sendMail }) => {
                    const subject = `Order #${order.id} cancelled: Seller Timeout`;
                    const htmlBase = `
                        <h1>Order Cancelled</h1>
                        <p>The buyer claimed a timeout resolution. The seller failed to initiate the transfer within the 30-minute window.</p>
                        <p><strong>Order ID:</strong> ${order.id}</p>
                        <p><strong>Refund ID:</strong> ${refund.id}</p>
                        <p><strong>Refund Status:</strong> ${refund.status}</p>
                    `;

                    if (order.buyer.email) sendMail({ to: order.buyer.email, subject, html: `${htmlBase}<p>Your payment should be refunded according to the seller-timeout flow.</p>` });
                    if (seller?.email) sendMail({ to: seller.email, subject, html: `${htmlBase}<p>You did not initiate the transfer in time.</p>` });
                    sendMail({ to: ADMIN_EMAIL, subject: `[ADMIN] Conflict Alert: Order #${order.id}`, html: `${htmlBase}<p>Manual claim by Buyer.</p>` });
                });

                return NextResponse.json(updatedOrder);
            } else {
                return NextResponse.json({ message: "Transfer time has not expired yet" }, { status: 400 });
            }
        }

        // SCENARIO 2: Seller started transfer but never uploaded evidence within 15 minutes.
        if (normalizedStatus === "TRANSFER_IN_PROGRESS" && order.transferStartedAt) {
            const evidenceDeadline = new Date(order.transferStartedAt).getTime() + EVIDENCE_TIMEOUT_MINUTES * 60000;

            if (now > evidenceDeadline) {
                if (!isBuyer && !isSeller) {
                    return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
                }

                const updatedOrder = await prisma.$transaction(async (tx) => {
                    const nextOrder = await tx.order.update({
                        where: { id: orderId },
                        data: { status: "EVIDENCE_TIMEOUT" }
                    });

                    await recordOrderStatus(tx, {
                        orderId,
                        fromStatus: normalizedStatus,
                        toStatus: "EVIDENCE_TIMEOUT",
                        note: "Evidence upload timeout",
                    });

                    return nextOrder;
                });

                return NextResponse.json(updatedOrder);
            }

            return NextResponse.json({ message: "Evidence upload time has not expired yet" }, { status: 400 });
        }

        // SCENARIO 3: Buyer confirmation timeout (10 mins)
        if (normalizedStatus === "AWAITING_CONFIRMATION" && order.evidenceUploadedAt) {
            const confirmationDeadline = new Date(order.evidenceUploadedAt).getTime() + BUYER_AUTO_CONFIRM_MINUTES * 60000;

            if (now > confirmationDeadline) {
                if (!isSeller) {
                    return NextResponse.json({ message: "Only Seller can claim earnings for confirmation timeout" }, { status: 403 });
                }

                if (!seller?.fundAccountId) {
                    return NextResponse.json({ message: "Seller payout account is not configured yet" }, { status: 400 });
                }

                if (!order.payment?.paymentId) {
                    return NextResponse.json({ message: "Captured payment record not found for this order" }, { status: 400 });
                }

                const sellerGross = order.orderItems.reduce((sum, item) => sum + item.price, 0);
                const sellerNetPayout = Math.max(0, sellerGross - (order.platformFeeSeller || 0));
                const payout = await createSellerPayout({
                    fundAccountId: seller.fundAccountId,
                    amountInRupees: sellerNetPayout,
                    orderId,
                });

                const updatedOrder = await prisma.$transaction(async (tx) => {
                    const nextOrder = await tx.order.update({
                        where: { id: orderId },
                        data: {
                            status: "COMPLETE",
                            buyerConfirmedAt: new Date()
                        }
                    });

                    const productIds = order.orderItems.map((item) => item.productId);
                    if (productIds.length > 0) {
                        await tx.products.updateMany({
                            where: {
                                id: { in: productIds }
                            },
                            data: {
                                isSold: true
                            }
                        });
                    }

                    await recordOrderStatus(tx, {
                        orderId,
                        fromStatus: normalizedStatus,
                        toStatus: "COMPLETE",
                        note: `Seller claimed buyer auto-confirm timeout. Payout ${payout.id} accepted with status ${payout.status}.`,
                    });

                    return nextOrder;
                });

                // Notify
                await import("@/lib/mail").then(({ sendMail }) => {
                    const subject = `Order #${order.id} completed: Auto-confirmation`;
                    const htmlBase = `
                        <h1>Order Completed</h1>
                        <p>The seller claimed completion. The buyer did not confirm within the 10-minute window.</p>
                        <p><strong>Order ID:</strong> ${order.id}</p>
                        <p><strong>Payout ID:</strong> ${payout.id}</p>
                        <p><strong>Payout Status:</strong> ${payout.status}</p>
                    `;
                    if (order.buyer.email) sendMail({ to: order.buyer.email, subject, html: `${htmlBase}<p>Funds released to seller.</p>` });
                    if (seller?.email) sendMail({ to: seller.email, subject, html: `${htmlBase}<p>Funds released to you.</p>` });
                    sendMail({ to: ADMIN_EMAIL, subject: `[ADMIN] Order Completed: Order #${order.id}`, html: `${htmlBase}<p>Manual claim by Seller.</p>` });
                });

                return NextResponse.json(updatedOrder);
            } else {
                return NextResponse.json({ message: "Confirmation time has not expired yet" }, { status: 400 });
            }
        }

        return NextResponse.json({ message: "No timeout resolution available for current status" }, { status: 400 });

    } catch (error: unknown) {
        console.error("Resolve timeout error:", error);
        return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
    }
}
