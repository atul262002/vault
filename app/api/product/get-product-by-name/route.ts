import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { name } = await req.json();
  const search = typeof name === "string" ? name.trim() : "";

  try {
    const products = await prisma.products.findMany({
      where: {
        isSold: false,
        OR: [
          {
            name: {
              contains: search,
              mode: "insensitive",
            },
          },
          {
            listingId: {
              contains: search.toUpperCase(),
            },
          },
        ],
      },
      include: {
        category: {
          select: {
            name: true,
          },
        },
      },
    });

    return NextResponse.json({ result: products }, { status: 200 })
  } catch (error) {
    console.error("Error fetching products by name:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
