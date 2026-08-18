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
    const { whatsappNumber, phone } = body;

    const dbUser = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!dbUser) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const updateData: Record<string, string | null> = {};
    const auditFields: string[] = [];

    if (whatsappNumber !== undefined) {
      const raw = String(whatsappNumber).replace(/^\+91/, "").replace(/\s/g, "");
      if (!/^[6-9]\d{9}$/.test(raw)) {
        return NextResponse.json(
          { message: "Enter a valid 10-digit Indian mobile number (starts with 6–9)" },
          { status: 400 }
        );
      }
      const formatted = `+91${raw}`;
      if (formatted !== dbUser.whatsappNumber) {
        auditFields.push(`whatsappNumber changed from ${dbUser.whatsappNumber || "none"} to ${formatted}`);
      }
      updateData.whatsappNumber = formatted;
    }

    if (phone !== undefined) {
      const raw = String(phone).replace(/^\+91/, "").replace(/\s/g, "");
      if (!/^[6-9]\d{9}$/.test(raw)) {
        return NextResponse.json(
          { message: "Enter a valid 10-digit Indian mobile number" },
          { status: 400 }
        );
      }
      const formatted = `+91${raw}`;
      if (formatted !== dbUser.phone) {
        auditFields.push(`phone changed from ${dbUser.phone || "none"} to ${formatted}`);
      }
      updateData.phone = formatted;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ message: "No fields to update" }, { status: 400 });
    }

    // Update user
    const updated = await prisma.user.update({
      where: { email: userEmail },
      data: updateData,
      select: { id: true, whatsappNumber: true, phone: true, name: true, email: true },
    });

    // Write audit log if anything actually changed
    if (auditFields.length > 0) {
      await prisma.payoutAuditLog.create({
        data: {
          userId: dbUser.id,
          changeDetails: `[CONTACT UPDATE] ${auditFields.join("; ")}`,
        },
      });
    }

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error("update-profile error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
