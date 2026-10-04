import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";

import { getCurrentDbUser } from "@/lib/current-db-user";
import { prisma } from "@/lib/db";
import { completeOrderPayment } from "@/lib/razorpay-payment";

const CAPTURE_RETRIES = 5;
const CAPTURE_RETRY_DELAY_MS = 1500;

function signaturesMatch(expected: string, provided: unknown) {
  if (typeof provided !== "string") return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(provided);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentDbUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const razorpayOrderId = body?.razorpay_order_id;
    const razorpayPaymentId = body?.razorpay_payment_id;

    if (typeof razorpayOrderId !== "string" || typeof razorpayPaymentId !== "string") {
      return NextResponse.json({ message: "Missing payment details" }, { status: 400 });
    }

    const secret = process.env.RAZORPAYX_KEY_SECRET;
    if (!secret) {
      console.error("RAZORPAYX_KEY_SECRET is not configured");
      return NextResponse.json({ message: "Payments are temporarily unavailable" }, { status: 503 });
    }

    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest("hex");

    if (!signaturesMatch(expectedSignature, body?.razorpay_signature)) {
      return NextResponse.json({ message: "Invalid signature" }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { razorpayId: razorpayOrderId },
      select: { buyerId: true },
    });
    if (!order || order.buyerId !== user.id) {
      return NextResponse.json({ message: "Order not found" }, { status: 404 });
    }

    let result = await completeOrderPayment({ razorpayOrderId, razorpayPaymentId, source: "client_verify" });
    for (let attempt = 0; result.status === 202 && attempt < CAPTURE_RETRIES; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, CAPTURE_RETRY_DELAY_MS));
      result = await completeOrderPayment({ razorpayOrderId, razorpayPaymentId, source: "client_verify" });
    }

    return NextResponse.json({ message: result.message }, { status: result.status });
  } catch (error) {
    console.error("Error verifying payment:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
