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
            }
        });

        return NextResponse.json(updatedOrder);

    } catch (error: any) {
        console.error("Upload evidence error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
