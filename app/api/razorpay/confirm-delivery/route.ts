import { prisma } from "@/lib/db";
import { currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";

const authHeader = 'Basic ' + Buffer.from(
  `${process.env.RAZORPAYX_KEY_ID}:${process.env.RAZORPAYX_KEY_SECRET}`
).toString('base64');

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user?.emailAddresses[0]?.emailAddress) {
      return NextResponse.json({ message: "Unauthorized user" }, { status: 401 });
    }

    const userEmail = user.emailAddresses[0].emailAddress;
    const existingUser = await prisma.user.findUnique({
      where: { email: userEmail },
    });

    if (!existingUser) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const { amount, sellerId, orderId } = await request.json();

    if (!amount || !sellerId || !orderId) {
      return NextResponse.json({ error: "Missing amount, seller ID, or order ID" }, { status: 400 });
    }

    const seller = await prisma.user.findUnique({
      where: {
        id: sellerId
      }
    });

    if (!seller) {
      return NextResponse.json({ error: "Seller not found" }, { status: 404 });
    }
    if (!seller.fundAccountId) {
      return NextResponse.json({ error: "Seller's fund account details are missing" }, { status: 400 });
    }

    const idempotencyKey = randomUUID(); // Generate unique idempotency key here per request

    const payoutPayload = {
      account_number: "10239046462",
      fund_account_id: seller.fundAccountId,
      amount: amount * 100,
      currency: "INR",
      mode: "IMPS",
      purpose: "payout",
      queue_if_low_balance: true,
      reference_id: `payout_${orderId.substring(0, 8)}`,
      narration: `Payout for Order ${orderId.substring(0, 8)}`,
    };

    const razorpayRes = await fetch("https://api.razorpay.com/v1/payouts", {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
        "X-Payout-Idempotency": idempotencyKey,
      },
      body: JSON.stringify(payoutPayload),
    });

    const data = await razorpayRes.json();

    if (!razorpayRes.ok) {
      console.error("Razorpay payout error:", data);
      return NextResponse.json({ error: data.error.description || "Razorpay error" }, { status: razorpayRes.status });
    }

    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: "COMPLETED",
      },
    });

    return NextResponse.json({ payout: data, message: "Payout initiated successfully to seller" }, { status: 200 });

  } catch (error: any) {
    console.error("Internal server error:", error);
    return NextResponse.json({ message: error.message || "Internal server error" }, { status: 500 });
  }
}
