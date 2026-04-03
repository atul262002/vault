import crypto from "crypto";

import { NextRequest, NextResponse } from "next/server";

import { completeOrderPayment } from "@/lib/razorpay-payment";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature");
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!secret || !signature) {
      return NextResponse.json({ message: "Webhook secret or signature missing" }, { status: 400 });
    }

    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(rawBody)
      .digest("hex");

    if (expectedSignature !== signature) {
      return NextResponse.json({ message: "Invalid webhook signature" }, { status: 400 });
    }

    const event = JSON.parse(rawBody);

    if (event.event !== "payment.captured") {
      return NextResponse.json({ ok: true, ignored: true });
    }

    const payment = event.payload?.payment?.entity;
    const razorpayOrderId = payment?.order_id;
    const razorpayPaymentId = payment?.id;

    if (!razorpayOrderId || !razorpayPaymentId) {
      return NextResponse.json({ message: "Missing Razorpay payment identifiers" }, { status: 400 });
    }

    const result = await completeOrderPayment({
      razorpayOrderId,
      razorpayPaymentId,
      source: "webhook",
    });

    return NextResponse.json(result, { status: result.status });
  } catch (error) {
    console.error("Razorpay webhook error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
