import { requireAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { recordOrderStatus } from "@/lib/order-flow";
import { OrderActionError, withLockedOrder } from "@/lib/order-lock";
import { DisputeStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ disputeId: string }> }
) {
  const admin = await requireAdminSession();
  if (!admin) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { status } = await req.json().catch(() => ({}));
  if (!Object.values(DisputeStatus).includes(status)) {
    return NextResponse.json({ message: "Invalid dispute status" }, { status: 400 });
  }

  const { disputeId } = await params;
  const dispute = await prisma.dispute.findUnique({ where: { id: disputeId } });
  if (!dispute) {
    return NextResponse.json({ message: "Dispute not found" }, { status: 404 });
  }
  if (dispute.isLocked || dispute.status === DisputeStatus.RESOLVED) {
    return NextResponse.json({ message: "Resolved disputes are locked" }, { status: 400 });
  }
  if (status === DisputeStatus.RESOLVED && !dispute.decisionType) {
    return NextResponse.json({ message: "Decision is required before resolving dispute" }, { status: 400 });
  }

  const updated = await prisma.dispute.update({
    where: { id: disputeId },
    data: {
      status,
      isLocked: status === DisputeStatus.RESOLVED ? true : dispute.isLocked,
      resolvedAt: status === DisputeStatus.RESOLVED ? new Date() : null,
    },
  });

  if (status === DisputeStatus.UNDER_REVIEW) {
    // Only an order that is still open may be (re)marked as disputed. A
    // completed or refunded order already had its money settled; reopening
    // it would allow a second refund or payout.
    try {
      await withLockedOrder(dispute.transactionId, async (tx, orderStatus) => {
        if (orderStatus === "DISPUTED") return;
        if (!["AWAITING_CONFIRMATION", "EVIDENCE_TIMEOUT"].includes(orderStatus)) {
          throw new OrderActionError(`Order is ${orderStatus} and can't be put under dispute`, 409);
        }
        await tx.order.update({
          where: { id: dispute.transactionId },
          data: { status: "DISPUTED" },
        });
        await recordOrderStatus(tx, {
          orderId: dispute.transactionId,
          fromStatus: orderStatus,
          toStatus: "DISPUTED",
          note: "Admin marked dispute as under review",
        });
      });
    } catch (error) {
      if (error instanceof OrderActionError) {
        return NextResponse.json({ message: error.message }, { status: error.status });
      }
      throw error;
    }
  }

  return NextResponse.json(updated);
}
