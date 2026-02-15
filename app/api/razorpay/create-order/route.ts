import { prisma } from "@/lib/db";
import { currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";

export async function POST(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user?.emailAddresses[0]?.emailAddress) {
      return NextResponse.json({ message: "Unauthorized user" }, { status: 401 });
    }

    const userEmail = user.emailAddresses[0].emailAddress;

    const existingUser = await prisma.user.upsert({
      where: { email: userEmail },
      update: {},
      create: {
        email: userEmail,
        name: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || "User",
        isVerified: false
      }
    });

    const { amount, currency, product, ticketPartner, transferDetails } = await req.json();
    if (!amount || !currency || !product) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    // Revenue Model: Platform Fee Calculation (Percentage Based)
    const platformFeeBuyer = Math.round(amount * 0.05); // 5%
    const platformFeeSeller = Math.round(amount * 0.025); // 2.5%

    // Total amount includes buyer fee
    const totalAmountToPay = amount + platformFeeBuyer;
    // Amount is already in rupees, convert to paise for razorpay
    const amountInPaise = Math.round(totalAmountToPay * 100);

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAYX_KEY_ID!,
      key_secret: process.env.RAZORPAYX_KEY_SECRET!,
    });

    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: currency || "INR",
      receipt: `receipt_${Date.now()}`,
    });

    const newOrder = await prisma.order.create({
      data: {
        razorpayId: order.id,
        buyerId: existingUser.id,
        totalAmount: totalAmountToPay,
        platformFeeBuyer: platformFeeBuyer,
        platformFeeSeller: platformFeeSeller,
        ticketPartner: ticketPartner,
        transferDetails: transferDetails,
        status: "PENDING",
        orderItems: {
          create: product.map((item: any) => ({
            productId: item.id,
            price: item.price
          }))
        }
      }
    });

    // Return all necessary data for Razorpay checkout
    return NextResponse.json({
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      orderId: newOrder.id
    }, { status: 200 });

  } catch (error: any) {
    console.error("Order creation error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}