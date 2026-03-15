import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { completeOrderPayment } from "@/lib/razorpay-payment";

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
            const result = await completeOrderPayment({
                razorpayOrderId: razorpay_order_id,
                razorpayPaymentId: razorpay_payment_id
            });

            return NextResponse.json({ message: result.message }, { status: result.status });
        } else {
            return NextResponse.json({ message: "Invalid signature" }, { status: 400 });
        }
    } catch (error) {
        console.error("Error verifying payment:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
