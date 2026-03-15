import { currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";

import { completeOrderPayment } from "@/lib/razorpay-payment";

type RazorpayOrderPayment = {
  id: string;
  status: string;
};

export async function POST(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user?.emailAddresses[0]?.emailAddress) {
      return NextResponse.json({ message: "Unauthorized user" }, { status: 401 });
    }

    const { razorpay_order_id } = await req.json();

    if (!razorpay_order_id) {
      return NextResponse.json({ message: "Missing order id" }, { status: 400 });
    }

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAYX_KEY_ID!,
      key_secret: process.env.RAZORPAYX_KEY_SECRET!,
    });

    const payments = await razorpay.orders.fetchPayments(razorpay_order_id);
    const successfulPayment = payments.items.find((payment: RazorpayOrderPayment) =>
      ["authorized", "captured"].includes(payment.status)
    );

    if (!successfulPayment) {
      return NextResponse.json({ status: "pending" }, { status: 200 });
    }

    const result = await completeOrderPayment({
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: successfulPayment.id,
    });

    return NextResponse.json(
      {
        status: "paid",
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
