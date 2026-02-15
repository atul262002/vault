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
            include: { orderItems: { include: { product: true } } }
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

        const updatedOrder = await prisma.order.update({
            where: { id: orderId },
            data: {
                status: "TRANSFER_INITIATED"
            },
            include: { buyer: true }
        });

        // Send email to Buyer
        if (updatedOrder.buyer.email) {
            // Calculate 60 mins from now
            const deadline = new Date(updatedOrder.transferStartedAt!.getTime() + 60 * 60000);

            await import("@/lib/mail").then(({ sendMail }) =>
                sendMail({
                    to: updatedOrder.buyer.email!,
                    subject: `Transfer Initiated: Order #${updatedOrder.id}`,
                    html: `
                        <h1>Seller has initiated the transfer!</h1>
                        <p>The seller for your order <strong>#${updatedOrder.id}</strong> has started the ticket transfer process.</p>
                        <p><strong>Transfer Deadline:</strong> ${deadline.toLocaleString()}</p>
                        <br/>
                        <h2>What to do next:</h2>
                        <ol>
                            <li>Wait for the seller to complete the transfer on the ticket platform (${updatedOrder.ticketPartner || 'User specified'}).</li>
                            <li>The seller will upload evidence of the transfer within 60 minutes.</li>
                            <li>Once evidence is uploaded, you will need to confirm receipt to release the funds.</li>
                        </ol>
                        <p><strong>Note:</strong> A platform fee of ₹${order.platformFeeSeller} (2.5%) has been applied to this transaction.</p>
                    `
                })
            );
        }

        return NextResponse.json(updatedOrder);

    } catch (error: any) {
        console.error("Initiate transfer error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
