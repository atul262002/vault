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
    const userRecord = await prisma.user.upsert({
      where: { email: userEmail },
      update: {},
      create: {
        email: userEmail,
        name: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || "User",
        isVerified: false
      }
    });

    const userId = userRecord.id;

    // 🔹 Revenue earned (as seller) – group by month
    const sellerRevenue = await prisma.$queryRaw<Array<{
      month: string;
      amount: number | null;
    }>>(Prisma.sql`
      SELECT
        TO_CHAR(DATE_TRUNC('month', o."createdAt"), 'YYYY-MM') AS month,
        COALESCE(SUM(o."totalAmount"), 0) AS amount
      FROM "Order" o
      WHERE o."status" = ${"COMPLETE"}::"OrderStatus"
        AND EXISTS (
          SELECT 1
          FROM "OrderItem" oi
          JOIN "Products" p ON p."id" = oi."productId"
          WHERE oi."orderId" = o."id"
            AND p."sellerId" = ${userId}
        )
      GROUP BY 1
      ORDER BY 1
    `);

    const buyerSpent = await prisma.$queryRaw<Array<{
      month: string;
      amount: number | null;
    }>>(Prisma.sql`
      SELECT
        TO_CHAR(DATE_TRUNC('month', o."createdAt"), 'YYYY-MM') AS month,
        COALESCE(SUM(o."totalAmount"), 0) AS amount
      FROM "Order" o
      WHERE o."status" = ${"COMPLETE"}::"OrderStatus"
        AND o."buyerId" = ${userId}
      GROUP BY 1
      ORDER BY 1
    `);

    // 🔹 Normalize into chart-friendly format
    const data: {
      month: string;
      revenue: number;
      spent: number;
    }[] = [];

    sellerRevenue.forEach((row) => {
      const month = row.month;
      const existing = data.find((d) => d.month === month);
      if (existing) {
        existing.revenue += Number(row.amount ?? 0);
      } else {
        data.push({
          month,
          revenue: Number(row.amount ?? 0),
          spent: 0,
        });
      }
    });

    buyerSpent.forEach((row) => {
      const month = row.month;
      const existing = data.find((d) => d.month === month);
      if (existing) {
        existing.spent += Number(row.amount ?? 0);
      } else {
        data.push({
          month,
          revenue: 0,
          spent: Number(row.amount ?? 0),
        });
      }
    });

    // Sort by month ascending
    data.sort((a, b) => a.month.localeCompare(b.month));

    return NextResponse.json(data);
  } catch (error: unknown) {
    console.error("Internal server error:", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
