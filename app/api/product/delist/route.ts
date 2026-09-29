import { NextRequest, NextResponse } from "next/server";

import { getCurrentDbUser } from "@/lib/current-db-user";
import { InventoryError, delistTickets } from "@/lib/product-inventory";

/**
 * Removes a number of unsold tickets from one of the seller's listings.
 * Body: { productId: string, quantity: number }
 * Tickets that are part of an active order can't be removed.
 */
export async function POST(request: NextRequest) {
  try {
    const seller = await getCurrentDbUser();
    if (!seller) {
      return NextResponse.json({ message: "Unauthenticated user" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const productId = typeof body?.productId === "string" ? body.productId : "";
    const quantity = Number(body?.quantity);

    if (!productId) {
      return NextResponse.json({ message: "Invalid productId" }, { status: 400 });
    }

    const result = await delistTickets({ sellerId: seller.id, productId, quantity });

    return NextResponse.json(
      {
        ...result,
        message: result.deleted
          ? "Listing removed."
          : `Removed ${result.removed} ticket(s). ${result.remaining} ticket(s) remain on this listing.`,
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof InventoryError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    console.error("Error removing tickets:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
