import { prisma } from "@/lib/db";
import { currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    console.log("📥 Fund account endpoint hit");
    const user = await currentUser();
    console.log("👤 Current user:", user);

    if (!user) {
      console.log("❌ Unauthenticated user");
      return NextResponse.json({ message: "Unauthenticated user" }, { status: 401 });
    }

    const body = await request.json();
    const { account_type, phoneNumber: rawPhone } = body;
    console.log("📦 Received body:", body);

    if (!account_type || !rawPhone) {
      console.log("❌ Missing required fields");
      return NextResponse.json(
        { message: "Account type and phone number are required" },
        { status: 400 }
      );
    }

    // Normalize phone number to +91XXXXXXXXXX
    const digitsOnly = rawPhone.replace(/\D/g, "");
    const tenDigit = digitsOnly.startsWith("91") && digitsOnly.length === 12
      ? digitsOnly.slice(2)   // strip leading 91 country code
      : digitsOnly;
    if (!/^[6-9]\d{9}$/.test(tenDigit)) {
      return NextResponse.json(
        { message: "Enter a valid 10-digit Indian mobile number (starts with 6–9)" },
        { status: 400 }
      );
    }
    const phoneNumber = `+91${tenDigit}`;

    // Validate based on account type
    if (account_type === "bank_account") {
      const { account_number, ifsc, name } = body;
      if (!account_number || !ifsc || !name) {
        console.log("❌ Missing bank account fields");
        return NextResponse.json(
          { message: "Account number, IFSC, and name are required for bank account" },
          { status: 400 }
        );
      }
    } else if (account_type === "vpa") {
      const { vpa_address } = body;
      if (!vpa_address) {
        console.log("❌ Missing UPI/VPA address");
        return NextResponse.json(
          { message: "UPI ID / VPA address is required" },
          { status: 400 }
        );
      }
    } else {
      console.log("❌ Invalid account type");
      return NextResponse.json({ message: "Invalid account type" }, { status: 400 });
    }

    // Step 1: Create Razorpay Contact
    console.log("🔁 Creating Razorpay contact...");
    console.log(`Using credentials: ${process.env.RAZORPAYX_KEY_ID}`);

    const contactResponse = await fetch("https://api.razorpay.com/v1/contacts", {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(
          `${process.env.RAZORPAYX_KEY_ID}:${process.env.RAZORPAYX_KEY_SECRET}`
        ).toString("base64")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: user.firstName || "User",
        email: user.emailAddresses?.[0]?.emailAddress,
        contact: phoneNumber,
        type: "vendor",
        reference_id: user.id,
      }),
    });

    const contact = await contactResponse.json();
    console.log("📞 Razorpay contact response:", contact);

    if (!contact.id) {
      console.log("❌ Failed to create contact");
      return NextResponse.json(
        { message: contact.error?.description || "Failed to create contact" },
        { status: 400 }
      );
    }

    // Step 2: Create Fund Account based on type
    console.log(`💰 Creating Razorpay fund account (${account_type})...`);

    let fundAccountBody: any = {
      contact_id: contact.id,
      account_type,
    };

    if (account_type === "bank_account") {
      fundAccountBody.bank_account = {
        name: body.name,
        ifsc: body.ifsc,
        account_number: body.account_number,
      };
    } else if (account_type === "vpa") {
      fundAccountBody.vpa = {
        address: body.vpa_address,
      };
    }

    const fundAccountResponse = await fetch("https://api.razorpay.com/v1/fund_accounts", {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(
          `${process.env.RAZORPAYX_KEY_ID}:${process.env.RAZORPAYX_KEY_SECRET}`
        ).toString("base64")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(fundAccountBody),
    });

    const fundAccount = await fundAccountResponse.json();
    console.log("🏦 Razorpay fund account response:", fundAccount);

    if (!fundAccount.id) {
      console.log("❌ Fund account not created");
      return NextResponse.json(
        { message: fundAccount.error?.description || "Invalid credentials" },
        { status: 400 }
      );
    }

    // Step 3: Validate the fund account (optional but recommended)
    console.log("✅ Validating fund account...");
    try {
      const validationResponse = await fetch(
        "https://api.razorpay.com/v1/fund_accounts/validations",
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${Buffer.from(
              `${process.env.RAZORPAYX_KEY_ID}:${process.env.RAZORPAYX_KEY_SECRET}`
            ).toString("base64")}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fund_account: {
              id: fundAccount.id,
            },
            amount: 1, // ₹1.00 for validation
            currency: "INR",
            notes: {
              purpose: "Account Validation",
            },
          }),
        }
      );

      const validation = await validationResponse.json();
      console.log("🔍 Validation response:", validation);
    } catch (validationError) {
      console.log("⚠️ Validation failed but continuing:", validationError);
      // Continue even if validation fails
    }

    // Step 4: Check if user exists, create or update
    console.log("🗃️ Updating user in DB...");
    const email = user.emailAddresses?.[0]?.emailAddress;

    let existingUser = await prisma.user.findUnique({
      where: { id: user.id },
    });

    if (!existingUser && email) {
      console.log("🔍 Checking by email since ID match failed...");
      existingUser = await prisma.user.findUnique({
        where: { email },
      });
    }

    if (existingUser) {
      console.log(`✅ Found existing user (ID: ${existingUser.id}). Updating...`);
      await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          phone: phoneNumber,
          fundAccountId: fundAccount.id,
          isVerified: true,
        },
      });
      console.log("✅ User updated successfully");
    } else {
      console.log("➕ No existing user found. Creating new...");
      await prisma.user.create({
        data: {
          id: user.id,
          email: email,
          name: user.firstName,
          fundAccountId: fundAccount.id,
          role: ["SELLER"],
          phone: phoneNumber,
          isVerified: true,
        },
      });
      console.log("✅ User created successfully");
    }

    return NextResponse.json(
      {
        message: "Account verified successfully",
        account_type,
        fundAccountId: fundAccount.id,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("🔥 Internal server error:", error);
    return NextResponse.json(
      { message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}