import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { name } = await req.json();
  const search = typeof name === "string" ? name.trim() : "";

  try {
    const normalizedSearch = `%${search}%`;
    const normalizedListingSearch = `%${search.toUpperCase()}%`;

    const productRows = await prisma.$queryRaw<Array<{
      id: string;
      listingId: string;
      name: string;
      imageUrl: string | null;
      image: string | null;
      price: number;
      refundPeriod: string;
      estimatedTime: string;
      description: string;
      sellerId: string;
      categoryId: string;
      isSold: boolean;
      createdAt: Date;
      updatedAt: Date;
      ticketQuantity: number;
      ticketPartner: string;
      category_name: string;
    }>>(Prisma.sql`
      SELECT
        p.*,
        c."name" AS category_name
      FROM "Products" p
      JOIN "Category" c ON c."id" = p."categoryId"
      WHERE p."isSold" = false
        AND (
          p."name" ILIKE ${normalizedSearch}
          OR p."listingId" ILIKE ${normalizedListingSearch}
        )
      ORDER BY p."createdAt" DESC
    `);

    const products = productRows.map((product) => ({
      id: product.id,
      listingId: product.listingId,
      name: product.name,
      imageUrl: product.imageUrl,
      image: product.image,
      price: product.price,
      refundPeriod: product.refundPeriod,
      estimatedTime: product.estimatedTime,
      description: product.description,
      sellerId: product.sellerId,
      categoryId: product.categoryId,
      isSold: product.isSold,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      ticketQuantity: product.ticketQuantity,
      ticketPartner: product.ticketPartner,
      category: {
        name: product.category_name,
      },
    }));

    return NextResponse.json({ result: products }, { status: 200 })
  } catch (error) {
    console.error("Error fetching products by name:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
