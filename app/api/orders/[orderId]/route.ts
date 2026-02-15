import { prisma } from "@/lib/db";
import { currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
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
                orderItems: {
                    include: {
                        product: {
                            include: {
                                seller: {
                                    select: { id: true, name: true, email: true }
                                }
                            }
                        }
                    }
                },
                buyer: {
                    select: { id: true, name: true, email: true }
                },
                payment: true
            }
        });

        if (!order) {
            return NextResponse.json({ message: "Order not found" }, { status: 404 });
        }

        // Access Control: Only Buyer or Seller can view
        const isBuyer = order.buyerId === user.id;
        const isSeller = order.orderItems.some(item => item.product.sellerId === user.id);

        if (!isBuyer && !isSeller) {
            return NextResponse.json({ message: "Unauthorized access to order" }, { status: 403 });
        }

        return NextResponse.json(order);

    } catch (error: any) {
        console.error("Fetch order error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
