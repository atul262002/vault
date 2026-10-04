import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";

import { getCurrentDbUser } from "@/lib/current-db-user";
import { prisma } from "@/lib/db";
import { completeOrderPayment } from "@/lib/razorpay-payment";

type RazorpayOrderPayment = {
  id: string;
  status: string;
};

const getRazorpayErrorMessage = (error: unknown) => {
  if (
    typeof error === "object" &&
    error !== null &&
    "error" in error &&
    typeof (error as { error?: { description?: unknown } }).error?.description === "string"
  ) {
    return (error as { error: { description: string } }).error.description;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Unable to fetch Razorpay order status";
};

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentDbUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized user" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const razorpay_order_id = body?.razorpay_order_id;

    if (typeof razorpay_order_id !== "string" || !razorpay_order_id) {
      return NextResponse.json({ message: "Missing order id" }, { status: 400 });
    }

    // Only the buyer who started this checkout may poll it.
    const order = await prisma.order.findUnique({
      where: { razorpayId: razorpay_order_id },
      select: { buyerId: true },
    });
    if (!order || order.buyerId !== user.id) {
      return NextResponse.json({ message: "Order not found" }, { status: 404 });
    }

    if (!process.env.RAZORPAYX_KEY_ID || !process.env.RAZORPAYX_KEY_SECRET) {
      return NextResponse.json(
        { message: "Razorpay credentials are not configured on the server" },
        { status: 500 }
      );
    }

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAYX_KEY_ID,
      key_secret: process.env.RAZORPAYX_KEY_SECRET,
    });

    let payments: Awaited<ReturnType<typeof razorpay.orders.fetchPayments>>;

    try {
      payments = await razorpay.orders.fetchPayments(razorpay_order_id);
    } catch (error) {
      const message = getRazorpayErrorMessage(error);
      console.error("Razorpay order status lookup failed:", error);
      return NextResponse.json({ message }, { status: 502 });
    }

    const successfulPayment = payments.items.find((payment: RazorpayOrderPayment) =>
      // Only captured money counts; authorized payments can still be voided.
      payment.status === "captured"
    );

    if (!successfulPayment) {
      return NextResponse.json({ status: "pending" }, { status: 200 });
    }

    const result = await completeOrderPayment({
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: successfulPayment.id,
      source: "order_status_poll",
    });

    if (result.status === 202) {
      return NextResponse.json({ status: "pending" }, { status: 200 });
    }

    return NextResponse.json(
      {
        status: result.ok ? "paid" : "failed",
        razorpay_payment_id: successfulPayment.id,
        message: result.message,
      },
      { status: result.status }
    );
  } catch (error) {
    console.error("Error fetching Razorpay order status:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
