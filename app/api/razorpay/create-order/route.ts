import { prisma } from "@/lib/db";
import { currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";

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

  return "Unable to create Razorpay order";
};

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
    const parsedAmount = Number(amount);
    const products = Array.isArray(product) ? product : [];

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0 || !currency || products.length === 0) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    // Revenue Model: Platform Fee Calculation (Percentage Based)
    const platformFeeBuyer = Math.round(parsedAmount * 0.05); // 5%
    const platformFeeSeller = Math.round(parsedAmount * 0.025); // 2.5%

    // Total amount includes buyer fee
    const totalAmountToPay = parsedAmount + platformFeeBuyer;
    // Amount is already in rupees, convert to paise for razorpay
    const amountInPaise = Math.round(totalAmountToPay * 100);

    if (!process.env.RAZORPAYX_KEY_ID || !process.env.RAZORPAYX_KEY_SECRET) {
      return NextResponse.json(
        { error: "Razorpay credentials are not configured on the server" },
        { status: 500 }
      );
    }

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAYX_KEY_ID,
      key_secret: process.env.RAZORPAYX_KEY_SECRET,
    });

    let order: Awaited<ReturnType<typeof razorpay.orders.create>>;

    try {
      order = await razorpay.orders.create({
        amount: amountInPaise,
        currency: currency || "INR",
        receipt: `receipt_${Date.now()}`,
      });
    } catch (error) {
      const message = getRazorpayErrorMessage(error);
      console.error("Razorpay order creation failed:", error);
      return NextResponse.json({ error: message }, { status: 502 });
    }

    if (!order?.id || order.amount == null || !order.currency) {
      console.error("Invalid Razorpay order payload:", order);
      return NextResponse.json(
        { error: "Razorpay returned an invalid order response" },
        { status: 502 }
      );
    }

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
          create: products.map((item: { id: string; price: number }) => ({
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

  } catch (error) {
    console.error("Order creation error:", error);
    return NextResponse.json({ error: getRazorpayErrorMessage(error) }, { status: 500 });
  }
}
