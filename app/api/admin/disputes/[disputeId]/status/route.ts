import { requireAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { recordOrderStatus } from "@/lib/order-flow";
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

  const { status } = await req.json();
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
    const order = await prisma.order.findUnique({ where: { id: dispute.transactionId } });
    if (order && order.status !== "DISPUTED") {
      await prisma.$transaction(async (tx) => {
        await tx.order.update({
          where: { id: dispute.transactionId },
          data: { status: "DISPUTED" },
        });
        await recordOrderStatus(tx, {
          orderId: dispute.transactionId,
          fromStatus: order.status,
          toStatus: "DISPUTED",
          note: "Admin marked dispute as under review",
        });
      });
    }
  }

  return NextResponse.json(updated);
}
