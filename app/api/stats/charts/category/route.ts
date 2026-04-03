import { prisma } from "@/lib/db";
import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const user = await currentUser();
    if (!user?.emailAddresses[0]?.emailAddress) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const userEmail = user.emailAddresses[0].emailAddress;

    // Find logged-in user
    const dbUser = await prisma.user.findUnique({
      where: { email: userEmail },
      select: { id: true },
    });

    if (!dbUser) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const products = await prisma.products.findMany({
      where: { sellerId: dbUser.id },
      select: {
        isSold: true,
        category: { select: { name: true } },
      },
    });

    const result: Record<string, { listings: number; sold: number }> = {};

    products.forEach((product) => {
      const city = product.category.name || "Other";
      if (!result[city]) {
        result[city] = { listings: 0, sold: 0 };
      }

      result[city].listings += 1;
      if (product.isSold) {
        result[city].sold += 1;
      }
    });

    const chartData = Object.entries(result).map(([city, values]) => ({
      city,
      listings: values.listings,
      sold: values.sold,
    }));

    return NextResponse.json(chartData);
  } catch (error) {
    console.error("Error fetching category analytics:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
