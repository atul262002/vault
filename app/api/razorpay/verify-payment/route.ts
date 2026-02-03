import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await req.json();

        const body = razorpay_order_id + "|" + razorpay_payment_id;

        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAYX_KEY_SECRET!)
            .update(body.toString())
            .digest("hex");

        const isAuthentic = expectedSignature === razorpay_signature;

        if (isAuthentic) {
            const order = await prisma.order.findUnique({
                where: { razorpayId: razorpay_order_id }
            });

            if (order) {
                await prisma.payment.create({
                    data: {
                        paymentId: razorpay_payment_id,
                        orderId: order.id,
                        status: "COMPLETED",
                        amount: order.totalAmount
                    }
                });
            }

            return NextResponse.json({ message: "Payment verified successfully" }, { status: 200 });
        } else {
            return NextResponse.json({ message: "Invalid signature" }, { status: 400 });
        }
    } catch (error) {
        console.error("Error verifying payment:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
