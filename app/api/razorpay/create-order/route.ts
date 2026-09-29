import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";

import { getCurrentDbUser } from "@/lib/current-db-user";
import { prisma } from "@/lib/db";
import { PAYMENT_PENDING_LOCK_MINUTES } from "@/lib/order-availability";
import { recordOrderStatus } from "@/lib/order-flow";
import { eventNotPastSql, reservedTicketCountSql } from "@/lib/product-inventory";

const BUYER_FEE_RATE = 0.05;
const SELLER_FEE_RATE = 0.025;
const MAX_RECEIVER_NAME_LENGTH = 100;

type RazorpayOrderResponse = {
  id: string;
  amount: number | string;
  currency: string;
};

type ListingAvailability = {
  id: string;
  price: number;
  isSold: boolean;
  ticketQuantity: number;
  sellerId: string;
  reserved: number;
  eventUpcoming: boolean;
  sellerCanBePaid: boolean;
};

class CheckoutError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
  }
}

function getRazorpayErrorMessage(error: unknown) {
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
}

function normalizePhone(raw: unknown) {
  if (typeof raw !== "string") {
    return null;
  }
  const digits = raw.replace(/\D/g, "");
  // Accept 10-digit Indian numbers, optionally prefixed with the 91 country code.
  const local = digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits;
  return /^[6-9]\d{9}$/.test(local) ? `+91${local}` : null;
}

function selectListing(db: Prisma.TransactionClient | typeof prisma, productId: string, lock: boolean) {
  return db.$queryRaw<ListingAvailability[]>(Prisma.sql`
    SELECT
      p."id",
      p."price",
      p."isSold",
      p."ticketQuantity",
      p."sellerId",
      ${reservedTicketCountSql(Prisma.raw(`p."id"`))} AS "reserved",
      ${eventNotPastSql("p")} AS "eventUpcoming",
      (s."fundAccountId" IS NOT NULL) AS "sellerCanBePaid"
    FROM "Products" p
    JOIN "User" s ON s."id" = p."sellerId"
    WHERE p."id" = ${productId}
    ${lock ? Prisma.sql`FOR UPDATE OF p` : Prisma.empty}
  `);
}

function assertAvailable(listing: ListingAvailability | undefined, buyerId: string) {
  if (!listing || listing.isSold || listing.reserved >= listing.ticketQuantity) {
    throw new CheckoutError("This listing is sold out or all remaining tickets are currently reserved.", 409);
  }
  if (!listing.eventUpcoming) {
    throw new CheckoutError("This event has already taken place, so tickets can no longer be bought.", 409);
  }
  if (!listing.sellerCanBePaid) {
    throw new CheckoutError("This seller hasn't finished setting up payouts yet, so this listing can't be bought right now.", 409);
  }
  if (listing.sellerId === buyerId) {
    throw new CheckoutError("You cannot purchase your own listing", 400);
  }
}

export async function POST(req: NextRequest) {
  try {
    const buyer = await getCurrentDbUser();
    if (!buyer) {
      return NextResponse.json({ error: "Unauthorized user" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const productId = Array.isArray(body?.product) ? body.product[0]?.id : undefined;
    const parsedAmount = Number(body?.amount);
    const receiverName = typeof body?.receiverName === "string" ? body.receiverName.trim() : "";
    const receiverPhone = normalizePhone(body?.receiverPhone);

    if (typeof productId !== "string" || !productId) {
      return NextResponse.json({ error: "A listing must be selected" }, { status: 400 });
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }
    if ((body?.currency ?? "INR") !== "INR") {
      return NextResponse.json({ error: "Only INR payments are supported" }, { status: 400 });
    }
    if (!receiverName || receiverName.length > MAX_RECEIVER_NAME_LENGTH) {
      return NextResponse.json({ error: "Please enter the receiver's name" }, { status: 400 });
    }
    if (!receiverPhone) {
      return NextResponse.json(
        { error: "Please enter a valid 10-digit Indian mobile number for the receiver" },
        { status: 400 }
      );
    }
    if (body?.termsAccepted !== true) {
      return NextResponse.json({ error: "You must accept the terms before paying" }, { status: 400 });
    }

    const [listing] = await selectListing(prisma, productId, false);
    assertAvailable(listing, buyer.id);

    if (Math.abs(parsedAmount - listing.price) > 0.01) {
      return NextResponse.json(
        { error: "Listing price changed. Please refresh and try again." },
        { status: 409 }
      );
    }

    // All money amounts are derived from the stored listing price, never from the client.
    const ticketPrice = Number(listing.price);
    const platformFeeBuyer = Math.round(ticketPrice * BUYER_FEE_RATE);
    const platformFeeSeller = Math.round(ticketPrice * SELLER_FEE_RATE);
    const totalAmountToPay = ticketPrice + platformFeeBuyer;
    const amountInPaise = Math.round(totalAmountToPay * 100);

    // A double click or a retried request must not reserve a second ticket.
    // Reuse this buyer's own unpaid checkout for the same listing while it
    // still holds its reservation.
    const existingPending = await prisma.order.findFirst({
      where: {
        buyerId: buyer.id,
        status: "PAYMENT_PENDING",
        createdAt: { gte: new Date(Date.now() - PAYMENT_PENDING_LOCK_MINUTES * 60 * 1000) },
        orderItems: { some: { productId } },
      },
      orderBy: { createdAt: "desc" },
    });

    if (existingPending && Math.abs(existingPending.totalAmount - totalAmountToPay) < 0.01) {
      await prisma.order.update({
        where: { id: existingPending.id },
        data: { receiverName, receiverPhone, termsAccepted: true },
      });

      return NextResponse.json(
        {
          id: existingPending.razorpayId,
          amount: amountInPaise,
          currency: "INR",
          orderId: existingPending.id,
        },
        { status: 200 }
      );
    }

    if (!process.env.RAZORPAYX_KEY_ID || !process.env.RAZORPAYX_KEY_SECRET) {
      console.error("Razorpay credentials are not configured on the server");
      return NextResponse.json({ error: "Payments are temporarily unavailable" }, { status: 503 });
    }

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAYX_KEY_ID,
      key_secret: process.env.RAZORPAYX_KEY_SECRET,
    });

    let razorpayOrder: RazorpayOrderResponse;
    try {
      razorpayOrder = (await razorpay.orders.create({
        amount: amountInPaise,
        currency: "INR",
        receipt: `rcpt_${Date.now()}`,
        notes: { productId, buyerId: buyer.id },
      })) as unknown as RazorpayOrderResponse;
    } catch (error) {
      console.error("Razorpay order creation failed:", error);
      return NextResponse.json({ error: getRazorpayErrorMessage(error) }, { status: 502 });
    }

    if (!razorpayOrder?.id || razorpayOrder.amount == null || !razorpayOrder.currency) {
      console.error("Invalid Razorpay order payload");
      return NextResponse.json({ error: "Razorpay returned an invalid order response" }, { status: 502 });
    }

    const newOrderId = await prisma.$transaction(async (tx) => {
      // Re-check under a row lock: another buyer or the seller removing
      // tickets may have changed availability since the first check.
      const [lockedListing] = await selectListing(tx, productId, true);
      assertAvailable(lockedListing, buyer.id);

      const orderId = crypto.randomUUID();

      await tx.$executeRaw(Prisma.sql`
        INSERT INTO "Order" (
          "id", "razorpayId", "buyerId", "totalAmount", "status",
          "platformFeeBuyer", "platformFeeSeller", "receiverName", "receiverPhone",
          "termsAccepted", "createdAt", "updatedAt"
        )
        VALUES (
          ${orderId}, ${razorpayOrder.id}, ${buyer.id}, ${totalAmountToPay},
          ${"PAYMENT_PENDING"}::"OrderStatus", ${platformFeeBuyer}, ${platformFeeSeller},
          ${receiverName}, ${receiverPhone}, true, NOW(), NOW()
        )
      `);

      await tx.$executeRaw(Prisma.sql`
        INSERT INTO "OrderItem" ("id", "orderId", "productId", "price", "createdAt")
        VALUES (${crypto.randomUUID()}, ${orderId}, ${lockedListing.id}, ${ticketPrice}, NOW())
      `);

      await recordOrderStatus(tx, {
        orderId,
        fromStatus: null,
        toStatus: "PAYMENT_PENDING",
        note: "Buyer opened Razorpay checkout",
      });

      return orderId;
    });

    return NextResponse.json(
      {
        id: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        orderId: newOrderId,
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof CheckoutError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Order creation error:", error);
    return NextResponse.json({ error: "Unable to start checkout. Please try again." }, { status: 500 });
  }
}
