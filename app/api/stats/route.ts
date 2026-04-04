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

    // Get user by email to find seller id
    const dbUser = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!dbUser) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }
    const sellerId = dbUser.id;

    // Get all completed order items where product seller is the logged-in user
    const [completedStats] = await prisma.$queryRaw<Array<{
      totalEarnings: number | null;
      vaultRecovered: number | bigint;
    }>>(Prisma.sql`
      SELECT
        COALESCE(SUM(oi."price"), 0) AS "totalEarnings",
        COUNT(*) AS "vaultRecovered"
      FROM "OrderItem" oi
      JOIN "Products" p ON p."id" = oi."productId"
      JOIN "Order" o ON o."id" = oi."orderId"
      WHERE p."sellerId" = ${sellerId}
        AND o."status" = ${"COMPLETE"}::"OrderStatus"
    `);

    const [pendingStats] = await prisma.$queryRaw<Array<{
      pendingAmount: number | null;
    }>>(Prisma.sql`
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
          ${"AWAITING_CONFIRMATION"}::"OrderStatus"
        )
    `);

    const totalEarnings = Number(completedStats?.totalEarnings ?? 0);
    const pendingAmount = Number(pendingStats?.pendingAmount ?? 0);
    const vaultRecovered = Number(completedStats?.vaultRecovered ?? 0);

    return NextResponse.json({ totalEarnings, pendingAmount, vaultRecovered });
  } catch (error: unknown) {
    console.error("Internal server error:", error);
    return NextResponse.json({ message: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
  }
}
