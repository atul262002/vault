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

    // 1️⃣ Purchases (user is buyer → "Bought")
    const purchases = await prisma.orderItem.groupBy({
      by: ["productId"],
      where: {
        order: { buyerId: dbUser.id },
      },
      _sum: { price: true },
    });

    // 2️⃣ Sales (user is seller → "Sold")
    const sales = await prisma.orderItem.groupBy({
      by: ["productId"],
      where: {
        product: { sellerId: dbUser.id },
      },
      _sum: { price: true },
    });

    // 3️⃣ Fetch product categories to map productId → category
    const products = await prisma.products.findMany({
      select: { id: true, category: { select: { name: true } } },
    });

    const productCategoryMap: Record<string, string> = {};
    products.forEach((p) => {
      productCategoryMap[p.id] = p.category.name;
    });

    // 4️⃣ Aggregate results per category
    const result: Record<string, { bought: number; sold: number }> = {};

    purchases.forEach((p) => {
      const category = productCategoryMap[p.productId] || "Others";
      if (!result[category]) result[category] = { bought: 0, sold: 0 };
      result[category].bought += p._sum.price || 0;
    });

    sales.forEach((s) => {
      const category = productCategoryMap[s.productId] || "Others";
      if (!result[category]) result[category] = { bought: 0, sold: 0 };
      result[category].sold += s._sum.price || 0;
    });

    // 5️⃣ Convert into chart format
    const chartData = Object.entries(result).map(([category, values]) => ({
      month: category,
      desktop: values.bought, // "Bought"
      mobile: values.sold,    // "Sold"
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
