import { NextRequest, NextResponse } from "next/server";

import { getCurrentDbUser } from "@/lib/current-db-user";
import { InventoryError, delistTickets } from "@/lib/product-inventory";

/**
 * "Delete listing": removes every ticket that is not part of an active
 * order. A listing that never had an order is deleted outright. Tickets in
 * active orders stay listed until those orders complete or are cancelled.
 * Body: { productId: string }
 */
export async function DELETE(request: NextRequest) {
  try {
    const seller = await getCurrentDbUser();
    if (!seller) {
      return NextResponse.json({ message: "Unauthenticated user" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const productId = typeof body?.productId === "string" ? body.productId : "";
    if (!productId) {
      return NextResponse.json({ message: "Invalid productId" }, { status: 400 });
    }

    const result = await delistTickets({ sellerId: seller.id, productId, quantity: "ALL" });

    let message: string;
    if (result.deleted) {
      message = "Listing deleted.";
    } else if (result.reserved > 0) {
      message = `Removed ${result.removed} unsold ticket(s). ${result.reserved} ticket(s) are part of active orders and stay listed until those orders finish.`;
    } else {
      message = `Removed ${result.removed} ticket(s). The listing is no longer on sale.`;
    }

    return NextResponse.json({ ...result, message }, { status: 200 });
  } catch (error) {
    if (error instanceof InventoryError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    console.error("Error deleting listing:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
