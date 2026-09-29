import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { getCurrentDbUser } from "@/lib/current-db-user";
import { prisma } from "@/lib/db";
import { describeInventory, reservedTicketCountSql, soldTicketCountSql } from "@/lib/product-inventory";

type SellerListingRow = {
  id: string;
  listingId: string;
  name: string;
  imageUrl: string | null;
  image: string | null;
  price: number;
  refundPeriod: string;
  estimatedTime: string;
  description: string;
  ticketPartner: string;
  isSold: boolean;
  ticketQuantity: number;
  createdAt: Date;
  reserved: number;
  sold: number;
};

export async function GET() {
  try {
    const seller = await getCurrentDbUser();
    if (!seller) {
      return NextResponse.json({ message: "Unauthorized user" }, { status: 401 });
    }

    const rows = await prisma.$queryRaw<SellerListingRow[]>(Prisma.sql`
      SELECT
        p."id", p."listingId", p."name", p."imageUrl", p."image", p."price",
        p."refundPeriod", p."estimatedTime", p."description", p."ticketPartner",
        p."isSold", p."ticketQuantity", p."createdAt",
        ${reservedTicketCountSql(Prisma.raw(`p."id"`))} AS "reserved",
        ${soldTicketCountSql(Prisma.raw(`p."id"`))} AS "sold"
      FROM "Products" p
      WHERE p."sellerId" = ${seller.id}
      ORDER BY p."createdAt" DESC
    `);

    const result = rows.map(({ reserved, sold, ...listing }) => ({
      ...listing,
      inventory: describeInventory({
        ticketQuantity: listing.ticketQuantity,
        reserved,
        sold,
        isSold: listing.isSold,
      }),
    }));

    return NextResponse.json({ result }, { status: 200 });
  } catch (error) {
    console.error("Error fetching seller listings:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
