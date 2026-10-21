import { NextRequest, NextResponse } from "next/server";

import { releaseUnpaidCheckout } from "@/lib/checkout-release";
import { getCurrentDbUser } from "@/lib/current-db-user";
import { rateLimit } from "@/lib/rate-limit";

const REASONS = new Set(["dismissed", "payment_failed", "page_closed"]);

/**
 * Body: { razorpay_order_id: string, checkout_token?: string, reason?: "dismissed" | "payment_failed" | "page_closed" }
 * Frees the ticket held by the caller's own unpaid checkout.
 */
export async function POST(req: NextRequest) {
  try {
    const buyer = await getCurrentDbUser();
    if (!buyer) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (!rateLimit(`release-checkout:${buyer.id}`, 30, 10 * 60_000)) {
      return NextResponse.json({ message: "Too many requests" }, { status: 429 });
    }

    const body = await req.json().catch(() => null);
    const razorpayOrderId = body?.razorpay_order_id;
    if (typeof razorpayOrderId !== "string" || !razorpayOrderId) {
      return NextResponse.json({ message: "Missing order id" }, { status: 400 });
    }
    const reason = REASONS.has(body?.reason) ? body.reason : "dismissed";
    const checkoutToken =
      typeof body?.checkout_token === "string" && body.checkout_token.length <= 64 ? body.checkout_token : undefined;

    const result = await releaseUnpaidCheckout({ razorpayOrderId, buyerId: buyer.id, reason, checkoutToken });
    return NextResponse.json(result, { status: result.released || result.reason !== "not_found" ? 200 : 404 });
  } catch (error) {
    console.error("Release checkout error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
