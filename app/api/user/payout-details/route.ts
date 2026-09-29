import { NextRequest, NextResponse } from "next/server";

import { getCurrentDbUser } from "@/lib/current-db-user";
import { prisma } from "@/lib/db";
import {
  FundAccountError,
  createRazorpayFundAccount,
  parsePayoutDestination,
} from "@/lib/razorpay-fund-account";

function maskAccountNumber(accountNumber: string | null) {
  if (!accountNumber) return null;
  return `••••${accountNumber.slice(-4)}`;
}

export async function GET() {
  try {
    const user = await getCurrentDbUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      {
        name: user.name,
        email: user.email,
        phone: user.phone,
        whatsappNumber: user.whatsappNumber,
        upiId: user.upiId,
        bankAccountNumber: user.bankAccountNumber,
        ifscCode: user.ifscCode,
        bankAccountHolder: user.bankAccountHolder,
        payoutMethod: user.payoutMethod,
        payoutAccountVerified: Boolean(user.fundAccountId),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("payout-details GET error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentDbUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const payoutMethod = body?.payoutMethod;
    if (payoutMethod !== "UPI" && payoutMethod !== "BANK") {
      return NextResponse.json({ message: "Invalid payout method" }, { status: 400 });
    }

    const destination = parsePayoutDestination({
      type: payoutMethod === "UPI" ? "vpa" : "bank_account",
      vpa: body?.upiId,
      accountNumber: body?.bankAccountNumber,
      ifsc: body?.ifscCode,
      holderName: body?.bankAccountHolder,
    });

    // Register the new destination with RazorpayX first. Payouts go to the
    // fund account, so the details are only saved once it exists.
    const fundAccountId = await createRazorpayFundAccount({
      referenceId: user.id,
      name: user.name || "Vault seller",
      email: user.email,
      phone: user.phone,
      destination,
    });

    const changes: string[] = [];
    if (payoutMethod !== user.payoutMethod) changes.push(`payoutMethod: ${payoutMethod}`);
    if (destination.type === "vpa" && destination.vpa !== user.upiId) changes.push(`upiId: ${destination.vpa}`);
    if (destination.type === "bank_account") {
      if (destination.accountNumber !== user.bankAccountNumber) {
        changes.push(`bankAccountNumber: ${maskAccountNumber(destination.accountNumber)}`);
      }
      if (destination.ifsc !== user.ifscCode) changes.push(`ifscCode: ${destination.ifsc}`);
      if (destination.holderName !== user.bankAccountHolder) {
        changes.push(`bankAccountHolder: ${destination.holderName}`);
      }
    }
    changes.push(`fundAccountId: ${fundAccountId}`);

    const [updated] = await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: {
          payoutMethod,
          fundAccountId,
          isVerified: true,
          upiId: destination.type === "vpa" ? destination.vpa : null,
          bankAccountNumber: destination.type === "bank_account" ? destination.accountNumber : null,
          ifscCode: destination.type === "bank_account" ? destination.ifsc : null,
          bankAccountHolder: destination.type === "bank_account" ? destination.holderName : null,
        },
        select: {
          id: true,
          payoutMethod: true,
          upiId: true,
          bankAccountNumber: true,
          ifscCode: true,
          bankAccountHolder: true,
        },
      }),
      prisma.payoutAuditLog.create({
        data: {
          userId: user.id,
          changeDetails: changes.join("; "),
        },
      }),
    ]);

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    if (error instanceof FundAccountError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    console.error("payout-details PATCH error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
