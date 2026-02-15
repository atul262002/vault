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
            where: { id: orderId }
        });

        if (!order) {
            return NextResponse.json({ message: "Order not found" }, { status: 404 });
        }

        // Verify user is the buyer
        if (order.buyerId !== user.id) {
            return NextResponse.json({ message: "Unauthorized: not the buyer" }, { status: 403 });
        }

        const updatedOrder = await prisma.order.update({
            where: { id: orderId },
            data: {
                status: "COMPLETED",
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

        // Trigger fund release logic
        // TODO: Integrate actual Razorpay Routes transfer here.
        // For now, we calculate the net amount.
        const totalAmount = updatedOrder.totalAmount;
        const platformFeeSeller = updatedOrder.platformFeeSeller || 0;
        // Platform fee buyer is already included in totalAmount but not paid to seller.
        // The seller gets (Product Price) - (Platform Fee Seller).

        // Notify Seller
        const seller = updatedOrder.orderItems[0].product.seller;
        if (seller && seller.email) {
            const netPayout = updatedOrder.orderItems[0].price - platformFeeSeller;

            await import("@/lib/mail").then(({ sendMail }) =>
                sendMail({
                    to: seller.email!,
                    subject: `Order Completed: Payment Released for Order #${updatedOrder.id}`,
                    html: `
                        <h1>Buyer confirmed receipt!</h1>
                        <p>The buyer for your order <strong>#${updatedOrder.id}</strong> has confirmed receipt of the tickets.</p>
                        <p><strong>Status:</strong> COMPLETED</p>
                        <br/>
                        <h2>Payment Details:</h2>
                        <p><strong>Item Price:</strong> ₹${updatedOrder.orderItems[0].price}</p>
                        <p><strong>Platform Fee (Seller):</strong> -₹${platformFeeSeller}</p>
                        <p><strong>Net Payout:</strong> ₹${netPayout}</p>
                        <br/>
                        <p>Your funds will be credited to your linked account within 24-48 hours.</p>
                    `
                })
            );
        }

        return NextResponse.json(updatedOrder);

    } catch (error: any) {
        console.error("Confirm order error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
