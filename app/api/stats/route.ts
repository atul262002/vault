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

    // Get user by email to find seller id
    const dbUser = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!dbUser) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }
    const sellerId = dbUser.id;

    // Get all completed order items where product seller is the logged-in user
    const completedOrderItems = await prisma.orderItem.findMany({
      where: {
        product: {
          sellerId: sellerId,
        },
        order: {
          status: "COMPLETED",
        },
      },
      select: {
        price: true,
      },
    });

    // Sum all prices of completed order items → total earnings
    const totalEarnings = completedOrderItems.reduce((sum, item) => sum + item.price, 0);

    // Similarly, sum pending order item prices
    const pendingOrderItems = await prisma.orderItem.findMany({
      where: {
        product: {
          sellerId: sellerId,
        },
        order: {
          status: "PENDING",
        },
      },
      select: {
        price: true,
      },
    });

    const pendingAmount = pendingOrderItems.reduce((sum, item) => sum + item.price, 0);

    // Count of completed orders for this seller
    const vaultRecovered = await prisma.orderItem.count({
      where: {
        product: {
          sellerId: sellerId,
        },
        order: {
          status: "COMPLETED",
        },
      },
    });

    return NextResponse.json({ totalEarnings, pendingAmount, vaultRecovered });
  } catch (error: any) {
    console.error("Internal server error:", error);
    return NextResponse.json({ message: error.message || "Internal server error" }, { status: 500 });
  }
}

