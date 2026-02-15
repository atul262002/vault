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

        const updatedOrder = await prisma.order.update({
            where: { id: orderId },
            data: {
                status: "EVIDENCE_UPLOADED",
                evidenceUrl: evidenceUrl,
                evidenceUploadedAt: new Date()
            },
            include: { buyer: true }
        });

        // Send email to Buyer
        if (updatedOrder.buyer.email) {
            // Calculate 30 mins from now
            const confirmationDeadline = new Date(updatedOrder.evidenceUploadedAt!.getTime() + 30 * 60000);

            await import("@/lib/mail").then(({ sendMail }) =>
                sendMail({
                    to: updatedOrder.buyer.email!,
                    subject: `Evidence Uploaded: Action Required for Order #${updatedOrder.id}`,
                    html: `
                        <h1>Seller has uploaded transfer evidence!</h1>
                        <p>The seller for your order <strong>#${updatedOrder.id}</strong> has uploaded proof of ticket transfer.</p>
                        <p><a href="${updatedOrder.evidenceUrl}">Click here to view the evidence</a></p>
                        <br/>
                        <h2>IMMEDIATE ACTION REQUIRED:</h2>
                        <p>Please review the evidence and confirm receipt of the tickets within <strong>30 minutes</strong> (by ${confirmationDeadline.toLocaleString()}).</p>
                        <p>If you do not take action, the funds may be automatically released to the seller.</p>
                        <br/>
                        <p><strong>Note:</strong> A platform fee of ₹${order.platformFeeSeller} (2.5%) has been applied to this transaction.</p>
                    `
                })
            );
        }

        return NextResponse.json(updatedOrder);

    } catch (error: any) {
        console.error("Upload evidence error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
