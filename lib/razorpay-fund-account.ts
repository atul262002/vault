/**
 * Registers a seller's payout destination with RazorpayX. Payouts are sent
 * to the returned fund account id (stored as `User.fundAccountId`), so any
 * change to a seller's bank/UPI details must go through here; saving the
 * details in the database alone does not change where money is sent.
 */

export const IFSC_PATTERN = /^[A-Z]{4}0[A-Z0-9]{6}$/;
export const ACCOUNT_NUMBER_PATTERN = /^\d{9,18}$/;
export const VPA_PATTERN = /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z][a-zA-Z0-9.-]{1,64}$/;

export type PayoutDestination =
  | { type: "bank_account"; accountNumber: string; ifsc: string; holderName: string }
  | { type: "vpa"; vpa: string };

type RazorpayEntity = { id?: string; error?: { description?: string } };

export class FundAccountError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "FundAccountError";
  }
}

function authHeader() {
  const keyId = process.env.RAZORPAYX_KEY_ID;
  const keySecret = process.env.RAZORPAYX_KEY_SECRET;
  if (!keyId || !keySecret) {
    console.error("RazorpayX credentials are not configured");
    throw new FundAccountError("Payout setup is temporarily unavailable", 503);
  }
  return `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`;
}

async function razorpayPost(path: string, payload: unknown) {
  const response = await fetch(`https://api.razorpay.com/v1/${path}`, {
    method: "POST",
    headers: { Authorization: authHeader(), "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = (await response.json().catch(() => ({}))) as RazorpayEntity;
  if (!response.ok || !data.id) {
    // Log only Razorpay's error text, never the submitted bank details.
    console.error(`RazorpayX ${path} request failed:`, data.error?.description ?? response.status);
    throw new FundAccountError(data.error?.description || "Could not verify these payout details", 400);
  }
  return data.id;
}

/** Validates and normalizes raw bank/UPI input. Throws FundAccountError on bad input. */
export function parsePayoutDestination(input: {
  type: unknown;
  accountNumber?: unknown;
  ifsc?: unknown;
  holderName?: unknown;
  vpa?: unknown;
}): PayoutDestination {
  if (input.type === "bank_account") {
    const accountNumber = String(input.accountNumber ?? "").replace(/\s/g, "");
    const ifsc = String(input.ifsc ?? "").trim().toUpperCase();
    const holderName = String(input.holderName ?? "").trim();
    if (!ACCOUNT_NUMBER_PATTERN.test(accountNumber)) {
      throw new FundAccountError("Enter a valid bank account number (9-18 digits)", 400);
    }
    if (!IFSC_PATTERN.test(ifsc)) {
      throw new FundAccountError("IFSC code must be 11 characters, e.g. HDFC0001234", 400);
    }
    if (holderName.length < 2 || holderName.length > 120) {
      throw new FundAccountError("Account holder name is required", 400);
    }
    return { type: "bank_account", accountNumber, ifsc, holderName };
  }

  if (input.type === "vpa") {
    const vpa = String(input.vpa ?? "").trim();
    if (!VPA_PATTERN.test(vpa)) {
      throw new FundAccountError("Enter a valid UPI ID, e.g. name@bank", 400);
    }
    return { type: "vpa", vpa };
  }

  throw new FundAccountError("Invalid payout method", 400);
}

export async function createRazorpayFundAccount({
  referenceId,
  name,
  email,
  phone,
  destination,
}: {
  referenceId: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  destination: PayoutDestination;
}) {
  const contactId = await razorpayPost("contacts", {
    name,
    ...(email ? { email } : {}),
    ...(phone ? { contact: phone } : {}),
    type: "vendor",
    reference_id: referenceId,
  });

  return razorpayPost("fund_accounts", {
    contact_id: contactId,
    account_type: destination.type,
    ...(destination.type === "bank_account"
      ? {
          bank_account: {
            name: destination.holderName,
            ifsc: destination.ifsc,
            account_number: destination.accountNumber,
          },
        }
      : { vpa: { address: destination.vpa } }),
  });
}
