import { NextRequest, NextResponse } from "next/server";

import { getCurrentDbUser } from "@/lib/current-db-user";
import { prisma } from "@/lib/db";
import {
  FundAccountError,
  createRazorpayFundAccount,
  parsePayoutDestination,
} from "@/lib/razorpay-fund-account";

function normalizePhone(raw: unknown) {
  if (typeof raw !== "string") return null;
  const digits = raw.replace(/\D/g, "");
  const local = digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits;
  return /^[6-9]\d{9}$/.test(local) ? `+91${local}` : null;
}

/** Seller verification: registers the seller's payout destination with RazorpayX. */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentDbUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthenticated user" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const phoneNumber = normalizePhone(body?.phoneNumber);
    if (!phoneNumber) {
      return NextResponse.json(
        { message: "Enter a valid 10-digit Indian mobile number (starts with 6–9)" },
        { status: 400 }
      );
    }

    const destination = parsePayoutDestination({
      type: body?.account_type,
      accountNumber: body?.account_number,
      ifsc: body?.ifsc,
      holderName: body?.name,
      vpa: body?.vpa_address,
    });

    const fundAccountId = await createRazorpayFundAccount({
      referenceId: user.id,
      name: user.name || "Vault seller",
      email: user.email,
      phone: phoneNumber,
      destination,
    });

    await prisma.user.update({
      where: { id: user.id },
      data: {
        phone: phoneNumber,
        fundAccountId,
        isVerified: true,
        payoutMethod: destination.type === "vpa" ? "UPI" : "BANK",
        upiId: destination.type === "vpa" ? destination.vpa : null,
        bankAccountNumber: destination.type === "bank_account" ? destination.accountNumber : null,
        ifscCode: destination.type === "bank_account" ? destination.ifsc : null,
        bankAccountHolder: destination.type === "bank_account" ? destination.holderName : null,
      },
    });

    return NextResponse.json(
      { message: "Account verified successfully", account_type: destination.type, fundAccountId },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof FundAccountError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    console.error("Fund account setup error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
