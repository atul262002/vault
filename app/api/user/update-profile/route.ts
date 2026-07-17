import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user?.emailAddresses[0]?.emailAddress) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const userEmail = user.emailAddresses[0].emailAddress;
    const body = await req.json();

    const { whatsappNumber } = body;
    if (!whatsappNumber || typeof whatsappNumber !== "string") {
      return NextResponse.json({ message: "whatsappNumber is required" }, { status: 400 });
    }

    // Validate Indian mobile number (10 digits starting with 6-9)
    const raw = whatsappNumber.replace(/^\+91/, "").replace(/\s/g, "");
    if (!/^[6-9]\d{9}$/.test(raw)) {
      return NextResponse.json(
        { message: "Enter a valid 10-digit Indian mobile number (starts with 6–9)" },
        { status: 400 }
      );
    }

    const formatted = `+91${raw}`;

    const dbUser = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!dbUser) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const updated = await prisma.user.update({
      where: { email: userEmail },
      data: { whatsappNumber: formatted },
      select: { id: true, whatsappNumber: true },
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error("update-profile error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
