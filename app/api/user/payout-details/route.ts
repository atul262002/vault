import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

const UPI_REGEX = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;
const IFSC_REGEX = /^[A-Z]{4}[A-Z0-9]{7}$/;

export async function GET() {
  try {
    const user = await currentUser();
    if (!user?.emailAddresses[0]?.emailAddress) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { email: user.emailAddresses[0].emailAddress },
      select: {
        name: true,
        email: true,
        phone: true,
        whatsappNumber: true,
        upiId: true,
        bankAccountNumber: true,
        ifscCode: true,
        bankAccountHolder: true,
        payoutMethod: true,
      },
    });

    if (!dbUser) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    return NextResponse.json(dbUser, { status: 200 });
  } catch (error) {
    console.error("payout-details GET error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user?.emailAddresses[0]?.emailAddress) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const userEmail = user.emailAddresses[0].emailAddress;
    const body = await req.json();
    const { payoutMethod, upiId, bankAccountNumber, ifscCode, bankAccountHolder } = body;

    if (!payoutMethod || !["UPI", "BANK"].includes(payoutMethod)) {
      return NextResponse.json({ message: "Invalid payout method" }, { status: 400 });
    }

    if (payoutMethod === "UPI") {
      if (!upiId || !UPI_REGEX.test(upiId)) {
        return NextResponse.json({ message: "Invalid UPI ID format" }, { status: 400 });
      }
    } else {
      if (!bankAccountNumber || bankAccountNumber.trim().length < 9) {
        return NextResponse.json({ message: "Enter a valid bank account number" }, { status: 400 });
      }
      if (!ifscCode || !IFSC_REGEX.test(ifscCode.toUpperCase())) {
        return NextResponse.json(
          { message: "IFSC code must be 11 characters: 4 letters + 7 alphanumeric" },
          { status: 400 }
        );
      }
      if (!bankAccountHolder || bankAccountHolder.trim().length < 2) {
        return NextResponse.json({ message: "Account holder name is required" }, { status: 400 });
      }
    }

    const dbUser = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!dbUser) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // Build audit log entry
    const changedFields: string[] = [];
    if (payoutMethod !== dbUser.payoutMethod) changedFields.push(`payoutMethod: ${payoutMethod}`);
    if (payoutMethod === "UPI" && upiId !== dbUser.upiId) changedFields.push(`upiId: ${upiId}`);
    if (payoutMethod === "BANK") {
      if (bankAccountNumber !== dbUser.bankAccountNumber) changedFields.push("bankAccountNumber changed");
      if (ifscCode !== dbUser.ifscCode) changedFields.push(`ifscCode: ${ifscCode}`);
      if (bankAccountHolder !== dbUser.bankAccountHolder) changedFields.push(`bankAccountHolder: ${bankAccountHolder}`);
    }

    const updateData =
      payoutMethod === "UPI"
        ? {
            payoutMethod,
            upiId,
            bankAccountNumber: null,
            ifscCode: null,
            bankAccountHolder: null,
          }
        : {
            payoutMethod,
            upiId: null,
            bankAccountNumber,
            ifscCode: ifscCode.toUpperCase(),
            bankAccountHolder,
          };

    const [updated] = await prisma.$transaction([
      prisma.user.update({
        where: { email: userEmail },
        data: updateData,
        select: { id: true, payoutMethod: true, upiId: true, bankAccountNumber: true, ifscCode: true, bankAccountHolder: true },
      }),
      prisma.payoutAuditLog.create({
        data: {
          userId: dbUser.id,
          changeDetails: changedFields.length > 0 ? changedFields.join("; ") : `Set payout method to ${payoutMethod}`,
        },
      }),
    ]);

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error("payout-details PATCH error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
