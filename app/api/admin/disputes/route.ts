import { requireAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { DisputeStatus } from "@prisma/client";
import { startOfWeek } from "date-fns";
import { NextResponse } from "next/server";

export async function GET() {
  const admin = await requireAdminSession();
  if (!admin) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const disputes = await prisma.dispute.findMany({
    include: {
      order: {
        include: {
          buyer: { select: { id: true, name: true, email: true } },
          orderItems: {
            include: {
              product: {
                include: {
                  seller: { select: { id: true, name: true, email: true } },
                },
              },
            },
          },
        },
      },
    },
    orderBy: { openedAt: "desc" },
  });

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });

  const activeDisputes = disputes.filter((d) => d.status !== DisputeStatus.RESOLVED).length;
  const resolvedThisWeek = disputes.filter((d) => d.resolvedAt && d.resolvedAt >= weekStart).length;
  const volumeThisWeek = disputes
    .filter((d) => d.createdAt >= weekStart)
    .reduce((sum, d) => sum + d.order.totalAmount, 0);

  return NextResponse.json({
    disputes,
    stats: {
      activeDisputes,
      resolvedThisWeek,
      volumeThisWeek,
    },
  });
}
