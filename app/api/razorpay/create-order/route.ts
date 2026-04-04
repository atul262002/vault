import { prisma } from "@/lib/db";
import { ACTIVE_LISTING_ORDER_STATUSES } from "@/lib/order-availability";
import { recordOrderStatus } from "@/lib/order-flow";
import { Prisma } from "@prisma/client";
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

    const { amount, currency, product, receiverName, receiverPhone, termsAccepted } = await req.json();
    const parsedAmount = Number(amount);
    const products = Array.isArray(product) ? product : [];

    if (
      !Number.isFinite(parsedAmount) ||
      parsedAmount <= 0 ||
      !currency ||
      products.length === 0 ||
      !receiverName ||
      !receiverPhone ||
      !termsAccepted
    ) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    const [selectedProduct] = await prisma.$queryRaw<Array<{
      id: string;
      isSold: boolean;
      sellerId: string;
      sellerName: string | null;
      sellerEmail: string | null;
      hasActiveOrder: boolean;
    }>>(Prisma.sql`
      SELECT
        p."id",
        p."isSold",
        p."sellerId",
        u."name" AS "sellerName",
        u."email" AS "sellerEmail",
        EXISTS (
          SELECT 1
          FROM "OrderItem" oi
          JOIN "Order" o ON o."id" = oi."orderId"
          WHERE oi."productId" = p."id"
            AND o."status" IN (${Prisma.join(
              ACTIVE_LISTING_ORDER_STATUSES.map((status) => Prisma.sql`${status}::"OrderStatus"`)
            )})
        ) AS "hasActiveOrder"
      FROM "Products" p
      JOIN "User" u ON u."id" = p."sellerId"
      WHERE p."id" = ${products[0].id}
      LIMIT 1
    `);

    if (!selectedProduct || selectedProduct.isSold || selectedProduct.hasActiveOrder) {
      return NextResponse.json({ error: "This listing is no longer available" }, { status: 409 });
    }

    if (selectedProduct.sellerId === existingUser.id) {
      return NextResponse.json({ error: "You cannot purchase your own listing" }, { status: 400 });
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

    const newOrder = await prisma.$transaction(async (tx) => {
      const orderId = crypto.randomUUID();

      const [createdOrder] = await tx.$queryRaw<Array<{
        id: string;
      }>>(Prisma.sql`
        INSERT INTO "Order" (
          "id",
          "razorpayId",
          "buyerId",
          "totalAmount",
          "status",
          "platformFeeBuyer",
          "platformFeeSeller",
          "receiverName",
          "receiverPhone",
          "termsAccepted",
          "createdAt",
          "updatedAt"
        )
        VALUES (
          ${orderId},
          ${order.id},
          ${existingUser.id},
          ${totalAmountToPay},
          ${"PAYMENT_PENDING"}::"OrderStatus",
          ${platformFeeBuyer},
          ${platformFeeSeller},
          ${receiverName},
          ${receiverPhone},
          ${Boolean(termsAccepted)},
          NOW(),
          NOW()
        )
        RETURNING "id"
      `);

      for (const item of products as Array<{ id: string; price: number }>) {
        await tx.$executeRaw(Prisma.sql`
          INSERT INTO "OrderItem" ("id", "orderId", "productId", "price", "createdAt")
          VALUES (
            ${crypto.randomUUID()},
            ${orderId},
            ${item.id},
            ${Number(item.price)},
            NOW()
          )
        `);
      }

      await recordOrderStatus(tx, {
        orderId,
        fromStatus: null,
        toStatus: "PAYMENT_PENDING",
        note: "Buyer opened Razorpay checkout",
      });

      return createdOrder;
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
