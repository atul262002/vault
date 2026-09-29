import { prisma } from "@/lib/db";
import { eventNotPastSql, reservedTicketCountSql } from "@/lib/product-inventory";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const search: string = typeof body?.name === "string" ? body.name.trim().slice(0, 100) : "";

  if (!search) {
    return NextResponse.json({ result: [] }, { status: 200 });
  }

  try {
    // Smart detection: if query starts with VLT- treat it as a listing ID exact match
    const isListingId = search.toUpperCase().startsWith("VLT-");
    
    // Split search into words for robust partial matching
    const searchWords = search.split(/\s+/).filter(Boolean);
    const normalizedListingSearch = `%${search.toUpperCase()}%`;

    // Generate dynamic conditions for ILIKE on multiple words
    const nameConditions = searchWords.length > 0 
      ? Prisma.join(
          searchWords.map(word => Prisma.sql`p."name" ILIKE ${'%' + word + '%'}`),
          ' AND '
        )
      : Prisma.sql`1=1`;

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
      reserved: number;
      ticketPartner: string;
      category_name: string;
    }>>(Prisma.sql`
      SELECT
        p.*,
        ${reservedTicketCountSql(Prisma.raw(`p."id"`))} AS "reserved",
        c."name" AS category_name
      FROM "Products" p
      JOIN "Category" c ON c."id" = p."categoryId"
      WHERE p."isSold" = false
        AND ${reservedTicketCountSql(Prisma.raw(`p."id"`))} < p."ticketQuantity"
        AND ${eventNotPastSql("p")}
        AND (
          ${isListingId
            ? Prisma.sql`p."listingId" = ${search.toUpperCase()}`
            : Prisma.sql`(${nameConditions}) OR p."listingId" ILIKE ${normalizedListingSearch}`
          }
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
      availableQuantity: Math.max(product.ticketQuantity - product.reserved, 0),
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
