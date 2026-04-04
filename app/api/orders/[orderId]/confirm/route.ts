import { prisma } from "@/lib/db";
import { getOrderPortalUrl } from "@/lib/app-url";
import { getCurrentDbUser } from "@/lib/current-db-user";
import { normalizeOrderStatus, recordOrderStatus } from "@/lib/order-flow";
import { createSellerPayout } from "@/lib/razorpay-money-flow";
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
                payment: true,
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

        // Verify user is the buyer
        if (order.buyerId !== user.id) {
            return NextResponse.json({ message: "Unauthorized: not the buyer" }, { status: 403 });
        }

        const currentStatus = normalizeOrderStatus(order.status);
        if (currentStatus !== "AWAITING_CONFIRMATION") {
            return NextResponse.json({ message: "Order is not awaiting buyer confirmation" }, { status: 400 });
        }

        const seller = order.orderItems[0]?.product.seller;
        if (!seller?.fundAccountId) {
            return NextResponse.json(
                { message: "Seller payout account is not configured yet. Please contact support." },
                { status: 400 }
            );
        }

        if (!order.payment?.paymentId) {
            return NextResponse.json(
                { message: "Captured payment record not found for this order" },
                { status: 400 }
            );
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
                },
                include: {
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

            const productIds = nextOrder.orderItems.map((item) => item.productId);
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
                fromStatus: currentStatus,
                toStatus: "COMPLETE",
                note: `Buyer confirmed receipt. Seller payout ${payout.id} accepted with status ${payout.status}.`,
            });

            return nextOrder;
        });

        const platformFeeSeller = updatedOrder.platformFeeSeller || 0;
        const updatedSeller = updatedOrder.orderItems[0].product.seller;
        if (updatedSeller && updatedSeller.email) {
            const sellerGross = updatedOrder.orderItems.reduce((sum, item) => sum + item.price, 0);
            const netPayout = sellerGross - platformFeeSeller;
            const orderPortalUrl = getOrderPortalUrl(updatedOrder.id);

            await import("@/lib/mail").then(({ sendMail }) =>
                sendMail({
                    to: updatedSeller.email!,
                    subject: `Order Completed: Payment Released for Order #${updatedOrder.id}`,
                    html: `
                        <h1>Buyer confirmed receipt!</h1>
                        <p>The buyer for your order <strong>#${updatedOrder.id}</strong> has confirmed receipt of the tickets.</p>
                        <p><strong>Status:</strong> COMPLETE</p>
                        <br/>
                        <h2>Payment Details:</h2>
                        <p><strong>Item Price:</strong> ₹${sellerGross}</p>
                        <p><strong>Platform Fee (Seller):</strong> -₹${platformFeeSeller}</p>
                        <p><strong>Net Payout:</strong> ₹${netPayout}</p>
                        <p><strong>Payout ID:</strong> ${payout.id}</p>
                        <p><strong>Payout Status:</strong> ${payout.status}</p>
                        <br/>
                        <p>Your payout has been initiated through RazorpayX.</p>
                        <p><a href="${orderPortalUrl}">Open this order in Vault</a></p>
                    `
                })
            );
        }

        return NextResponse.json(updatedOrder);

    } catch (error: unknown) {
        console.error("Confirm order error:", error);
        return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
    }
}
