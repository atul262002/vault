import { prisma } from "@/lib/db";
import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const user = await currentUser();
    if (!user?.emailAddresses[0]?.emailAddress) {
      return NextResponse.json({ message: "Unauthorized user" }, { status: 401 });
    }

    const userEmail = user.emailAddresses[0].emailAddress;
    const userRecord = await prisma.user.findUnique({
      where: { email: userEmail },
    });

    if (!userRecord) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const userId = userRecord.id;

    // 🔹 Revenue earned (as seller) – group by month
    const sellerRevenue = await prisma.order.groupBy({
      by: ["createdAt"],
      where: {
        status: "COMPLETED",
        orderItems: {
          some: {
            product: { sellerId: userId },
          },
        },
      },
      _sum: { totalAmount: true },
    });

    // 🔹 Money spent (as buyer) – group by month
    const buyerSpent = await prisma.order.groupBy({
      by: ["createdAt"],
      where: {
        status: "COMPLETED",
        buyerId: userId,
      },
      _sum: { totalAmount: true },
    });

    // 🔹 Normalize into chart-friendly format
    const data: {
      month: string;
      revenue: number;
      spent: number;
    }[] = [];

    // Helper: format YYYY-MM
    const formatMonth = (date: Date) =>
      `${date.getFullYear()}-${(date.getMonth() + 1)
        .toString()
        .padStart(2, "0")}`;

    // Insert seller revenue
    sellerRevenue.forEach((row) => {
      const month = formatMonth(row.createdAt);
      const existing = data.find((d) => d.month === month);
      if (existing) {
        existing.revenue += row._sum.totalAmount ?? 0;
      } else {
        data.push({
          month,
          revenue: row._sum.totalAmount ?? 0,
          spent: 0,
        });
      }
    });

    // Insert buyer spent
    buyerSpent.forEach((row) => {
      const month = formatMonth(row.createdAt);
      const existing = data.find((d) => d.month === month);
      if (existing) {
        existing.spent += row._sum.totalAmount ?? 0;
      } else {
        data.push({
          month,
          revenue: 0,
          spent: row._sum.totalAmount ?? 0,
        });
      }
    });

    // Sort by month ascending
    data.sort((a, b) => a.month.localeCompare(b.month));

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Internal server error:", error);
    return NextResponse.json(
      { message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
