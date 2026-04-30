import { requireAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ disputeId: string }> }
) {
  const admin = await requireAdminSession();
  if (!admin) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { disputeId } = await params;
  const dispute = await prisma.dispute.findUnique({
    where: { id: disputeId },
    include: {
      order: {
        include: {
          statusHistory: { orderBy: { createdAt: "asc" } },
          buyer: { select: { id: true, name: true, email: true } },
          orderItems: {
            include: {
              product: {
                include: {
                  seller: { select: { id: true, name: true, email: true, fundAccountId: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!dispute) {
    return NextResponse.json({ message: "Dispute not found" }, { status: 404 });
  }

  return NextResponse.json(dispute);
}
