type RazorpayFundAccount = {
  id: string;
  account_type: "bank_account" | "vpa" | string;
  active?: boolean;
};

type RazorpayPayout = {
  id: string;
  status: "queued" | "pending" | "processing" | "processed" | "cancelled" | "reversed" | "failed" | string;
  amount: number;
  fund_account_id: string;
  reference_id?: string;
  utr?: string | null;
  mode?: string;
  status_details?: {
    description?: string;
    reason?: string;
    source?: string;
  };
};

type RazorpayRefund = {
  id: string;
  status: "pending" | "processed" | "failed" | string;
  amount: number;
  payment_id: string;
  receipt?: string | null;
  notes?: Record<string, string>;
  acquirer_data?: {
    arn?: string | null;
    rrn?: string | null;
    utr?: string | null;
  };
};

const acceptedPayoutStatuses = new Set(["queued", "pending", "processing", "processed"]);
const acceptedRefundStatuses = new Set(["pending", "processed"]);

function getBasicAuthHeader() {
  const keyId = process.env.RAZORPAYX_KEY_ID;
  const keySecret = process.env.RAZORPAYX_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error("Razorpay credentials are not configured on the server");
  }

  return `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`;
}

function getSourceAccountNumber() {
  const accountNumber =
    process.env.RAZORPAYX_SOURCE_ACCOUNT_NUMBER ||
    process.env.RAZORPAYX_ACCOUNT_NUMBER ||
    process.env.RAZORPAYX_CUSTOMER_IDENTIFIER;

  if (!accountNumber) {
    throw new Error(
      "Missing Razorpay source account. Set RAZORPAYX_SOURCE_ACCOUNT_NUMBER in your environment."
    );
  }

  return accountNumber;
}

function toPaise(amountInRupees: number) {
  return Math.round(amountInRupees * 100);
}

function compactOrderId(orderId: string) {
  return orderId.replace(/-/g, "");
}

async function parseRazorpayResponse<T>(response: Response): Promise<T> {
  const rawBody = await response.text();
  const data = rawBody ? JSON.parse(rawBody) : {};

  if (!response.ok) {
    const description =
      data?.error?.description ||
      data?.message ||
      `Razorpay request failed with status ${response.status}`;
    throw new Error(description);
  }

  return data as T;
}

async function fetchFundAccount(fundAccountId: string) {
  const response = await fetch(`https://api.razorpay.com/v1/fund_accounts/${fundAccountId}`, {
    method: "GET",
    headers: {
      Authorization: getBasicAuthHeader(),
      "Content-Type": "application/json",
    },
  });

  return parseRazorpayResponse<RazorpayFundAccount>(response);
}

export async function createSellerPayout({
  fundAccountId,
  amountInRupees,
  orderId,
}: {
  fundAccountId: string;
  amountInRupees: number;
  orderId: string;
}) {
  if (!fundAccountId) {
    throw new Error("Seller payout account is not configured");
  }

  if (!Number.isFinite(amountInRupees) || amountInRupees < 1) {
    throw new Error("Seller payout amount must be at least INR 1");
  }

  const fundAccount = await fetchFundAccount(fundAccountId);

  if (fundAccount.active === false) {
    throw new Error("Seller payout account is inactive");
  }

  const mode = fundAccount.account_type === "vpa" ? "UPI" : "IMPS";
  const idempotencyKey = `po_${compactOrderId(orderId)}`;
  const referenceId = `po-${orderId}`;

  const response = await fetch("https://api.razorpay.com/v1/payouts", {
    method: "POST",
    headers: {
      Authorization: getBasicAuthHeader(),
      "Content-Type": "application/json",
      "X-Payout-Idempotency": idempotencyKey,
    },
    body: JSON.stringify({
      account_number: getSourceAccountNumber(),
      fund_account_id: fundAccountId,
      amount: toPaise(amountInRupees),
      currency: "INR",
      mode,
      purpose: "payout",
      queue_if_low_balance: true,
      reference_id: referenceId,
      narration: "Vault payout",
      notes: {
        orderId,
        type: "seller_payout",
      },
    }),
  });

  const payout = await parseRazorpayResponse<RazorpayPayout>(response);

  if (!acceptedPayoutStatuses.has(payout.status)) {
    throw new Error(
      payout.status_details?.description ||
        `Seller payout failed with status ${payout.status}`
    );
  }

  return payout;
}

export async function createBuyerRefund({
  paymentId,
  amountInRupees,
  orderId,
}: {
  paymentId: string;
  amountInRupees: number;
  orderId: string;
}) {
  if (!paymentId) {
    throw new Error("Captured payment id is required for refund");
  }

  if (!Number.isFinite(amountInRupees) || amountInRupees < 1) {
    throw new Error("Refund amount must be at least INR 1");
  }

  const idempotencyKey = `rf_${compactOrderId(orderId)}`;
  const receipt = `rf-${orderId}`;

  const response = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}/refund`, {
    method: "POST",
    headers: {
      Authorization: getBasicAuthHeader(),
      "Content-Type": "application/json",
      "X-Refund-Idempotency": idempotencyKey,
    },
    body: JSON.stringify({
      amount: toPaise(amountInRupees),
      speed: "optimum",
      receipt,
      notes: {
        orderId,
        type: "buyer_refund",
      },
    }),
  });

  const refund = await parseRazorpayResponse<RazorpayRefund>(response);

  if (!acceptedRefundStatuses.has(refund.status)) {
    throw new Error(`Refund failed with status ${refund.status}`);
  }

  return refund;
}
