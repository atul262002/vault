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
                status: "DISPUTED"
            },
            include: {
                orderItems: {
                    include: { product: true }
                },
                buyer: true
            }
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
                    <br/>
                    <p>Please review the evidence and contact both parties.</p>
                `
            })
        );

        return NextResponse.json(updatedOrder);

    } catch (error: any) {
        console.error("Dispute order error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
