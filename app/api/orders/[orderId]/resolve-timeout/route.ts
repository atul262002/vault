import { prisma } from "@/lib/db";
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

        // SCENARIO 1: Seller Transfer Timeout (60 mins)
        // Buyer claims refund because Seller didn't transfer in time.
        if (order.status === "TRANSFER_INITIATED" && order.transferStartedAt) {
            const transferDeadline = new Date(order.transferStartedAt).getTime() + 60 * 60000;

            if (now > transferDeadline) {
                if (!isBuyer) {
                    return NextResponse.json({ message: "Only Buyer can claim refund for transfer timeout" }, { status: 403 });
                }

                // Update Status
                const updatedOrder = await prisma.order.update({
                    where: { id: orderId },
                    data: { status: "CANCELLED" } // Using CANCELLED as CANCELLED_BY_TIMEOUT is not in Enum, assuming standard CANCELLED
                });

                // TODO: Trigger Refund Logic Here (Razorpay Refund)

                // Notify
                await import("@/lib/mail").then(({ sendMail }) => {
                    const subject = `Order #${order.id} Cancelled: Transfer Timeout`;
                    const html = `
                        <h1>Order Cancelled</h1>
                        <p>The order has been cancelled because the transfer was not completed within the 60-minute window.</p>
                        <p><strong>Refund Status:</strong> Initiated (Mock)</p>
                    `;
                    if (order.buyer.email) sendMail({ to: order.buyer.email, subject, html });
                    if (seller?.email) sendMail({ to: seller.email, subject, html });
                });

                return NextResponse.json(updatedOrder);
            } else {
                return NextResponse.json({ message: "Transfer time has not expired yet" }, { status: 400 });
            }
        }

        // SCENARIO 2: Buyer Confirmation Timeout (30 mins)
        // Seller claims earnings because Buyer didn't confirm in time.
        if (order.status === "EVIDENCE_UPLOADED" && order.evidenceUploadedAt) {
            const confirmationDeadline = new Date(order.evidenceUploadedAt).getTime() + 30 * 60000;

            if (now > confirmationDeadline) {
                if (!isSeller) {
                    return NextResponse.json({ message: "Only Seller can claim earnings for confirmation timeout" }, { status: 403 });
                }

                // Update Status to COMPLETED
                // Recalculate fees/payout
                const platformFeeSeller = order.platformFeeSeller || 99;

                const updatedOrder = await prisma.order.update({
                    where: { id: orderId },
                    data: {
                        status: "COMPLETED",
                        buyerConfirmedAt: new Date() // Auto-confirmed
                    }
                });

                // TODO: Trigger Payout Logic Here

                // Notify
                await import("@/lib/mail").then(({ sendMail }) => {
                    const subject = `Order #${order.id} Completed: Auto-Confirmation`;
                    const html = `
                        <h1>Order Completed</h1>
                        <p>The order has been auto-completed because the buyer did not confirm within the 30-minute window.</p>
                        <p><strong>Funds Status:</strong> Released to Seller</p>
                    `;
                    if (order.buyer.email) sendMail({ to: order.buyer.email, subject, html });
                    if (seller?.email) sendMail({ to: seller.email, subject, html });
                });

                return NextResponse.json(updatedOrder);
            } else {
                return NextResponse.json({ message: "Confirmation time has not expired yet" }, { status: 400 });
            }
        }

        return NextResponse.json({ message: "No timeout resolution available for current status" }, { status: 400 });

    } catch (error: any) {
        console.error("Resolve timeout error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
