import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const user = await currentUser();
    if (!user?.emailAddresses[0]?.emailAddress) {
      return NextResponse.json({ message: "Unauthorized user" }, { status: 401 });
    }

    const userEmail = user.emailAddresses[0].emailAddress;

    const dbUser = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!dbUser) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }
    const sellerId = dbUser.id;

    // Earnings: SUM(ticket price - 2.5% seller fee) for COMPLETE orders
    const [earningsRow] = await prisma.$queryRaw<Array<{ totalEarnings: number | null }>>(
      Prisma.sql`
        SELECT
          COALESCE(SUM(oi."price" - COALESCE(o."platformFeeSeller", 0)), 0) AS "totalEarnings"
        FROM "OrderItem" oi
        JOIN "Products" p ON p."id" = oi."productId"
        JOIN "Order" o ON o."id" = oi."orderId"
        WHERE p."sellerId" = ${sellerId}
          AND o."status" = ${"COMPLETE"}::"OrderStatus"
      `
    );

    // Pending: SUM held in escrow including DISPUTED status
    const [pendingRow] = await prisma.$queryRaw<Array<{ pendingAmount: number | null }>>(
      Prisma.sql`
        SELECT COALESCE(SUM(oi."price"), 0) AS "pendingAmount"
        FROM "OrderItem" oi
        JOIN "Products" p ON p."id" = oi."productId"
        JOIN "Order" o ON o."id" = oi."orderId"
        WHERE p."sellerId" = ${sellerId}
          AND o."status" IN (
            ${"PAYMENT_PENDING"}::"OrderStatus",
            ${"FUNDS_HELD"}::"OrderStatus",
            ${"TRANSFER_PENDING"}::"OrderStatus",
            ${"TRANSFER_IN_PROGRESS"}::"OrderStatus",
            ${"AWAITING_CONFIRMATION"}::"OrderStatus",
            ${"DISPUTED"}::"OrderStatus"
          )
      `
    );

    // Recovered: SUM refunded to buyers where dispute was decided REFUND (seller lost)
    const [recoveredRow] = await prisma.$queryRaw<Array<{ vaultRecovered: number | null }>>(
      Prisma.sql`
        SELECT COALESCE(SUM(o."totalAmount"), 0) AS "vaultRecovered"
        FROM "Order" o
        JOIN "OrderItem" oi ON oi."orderId" = o."id"
        JOIN "Products" p ON p."id" = oi."productId"
        JOIN "Dispute" d ON d."transactionId" = o."id"
        WHERE p."sellerId" = ${sellerId}
          AND o."status" = ${"REFUNDED"}::"OrderStatus"
          AND d."decisionType" = ${"REFUND"}::"DisputeDecisionType"
      `
    );

    return NextResponse.json({
      totalEarnings: Number(earningsRow?.totalEarnings ?? 0),
      pendingAmount: Number(pendingRow?.pendingAmount ?? 0),
      vaultRecovered: Number(recoveredRow?.vaultRecovered ?? 0),
    });
  } catch (error: unknown) {
    console.error("Stats API error:", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
