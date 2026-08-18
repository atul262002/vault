import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const user = await currentUser();
    if (!user?.emailAddresses[0]?.emailAddress) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { email: user.emailAddresses[0].emailAddress },
      select: { id: true },
    });

    if (!dbUser) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const logs = await prisma.payoutAuditLog.findMany({
      where: { userId: dbUser.id },
      orderBy: { changedAt: "desc" },
      take: 20,
    });

    return NextResponse.json(logs, { status: 200 });
  } catch (error) {
    console.error("audit-log GET error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
