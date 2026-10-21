/**
 * Read-only lookup of a payment's bank references from Razorpay, for the
 * admin dispute view. The RRN (and UPI / bank transaction ids) is what a
 * buyer's bank asks for when tracing a payment or refund.
 */

type AcquirerData = {
  rrn?: string | null;
  upi_transaction_id?: string | null;
  bank_transaction_id?: string | null;
  auth_code?: string | null;
  arn?: string | null;
  utr?: string | null;
};

type RazorpayPaymentEntity = {
  id: string;
  order_id: string | null;
  status: string;
  method: string;
  amount: number;
  amount_refunded: number;
  currency: string;
  captured: boolean;
  bank?: string | null;
  wallet?: string | null;
  vpa?: string | null;
  card?: { network?: string | null; last4?: string | null } | null;
  acquirer_data?: AcquirerData | null;
  created_at: number;
};

type RazorpayRefundEntity = {
  id: string;
  amount: number;
  status: string;
  speed_processed?: string | null;
  acquirer_data?: AcquirerData | null;
  created_at: number;
};

export type PaymentBankDetails = {
  paymentId: string;
  status: string;
  method: string;
  amountInRupees: number;
  refundedInRupees: number;
  /** Bank Retrieval Reference Number; set for UPI, card and most netbanking payments. */
  rrn: string | null;
  upiTransactionId: string | null;
  bankTransactionId: string | null;
  authCode: string | null;
  /** How the buyer paid, e.g. "UPI · name@okhdfcbank" or "Card · VISA ••4242". */
  instrument: string | null;
  paidAt: string;
  refunds: Array<{
    refundId: string;
    amountInRupees: number;
    status: string;
    /** Reference the buyer's bank uses to trace a refund (ARN, or RRN/UTR for UPI). */
    bankReference: string | null;
    createdAt: string;
  }>;
};

function authHeader() {
  const keyId = process.env.RAZORPAYX_KEY_ID;
  const keySecret = process.env.RAZORPAYX_KEY_SECRET;
  if (!keyId || !keySecret) {
    throw new Error("Razorpay credentials are not configured on the server");
  }
  return `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`;
}

async function razorpayGet<T>(path: string): Promise<T> {
  const response = await fetch(`https://api.razorpay.com/v1/${path}`, {
    headers: { Authorization: authHeader() },
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error?.description || `Razorpay request failed with status ${response.status}`);
  }
  return data as T;
}

function describeInstrument(p: RazorpayPaymentEntity) {
  switch (p.method) {
    case "upi":
      return p.vpa ? `UPI · ${p.vpa}` : "UPI";
    case "card":
      return p.card?.last4 ? `Card · ${p.card.network ?? ""} ••${p.card.last4}`.replace("  ", " ") : "Card";
    case "netbanking":
      return p.bank ? `Netbanking · ${p.bank}` : "Netbanking";
    case "wallet":
      return p.wallet ? `Wallet · ${p.wallet}` : "Wallet";
    default:
      return p.method || null;
  }
}

export async function fetchPaymentBankDetails(paymentId: string): Promise<PaymentBankDetails> {
  if (!/^pay_[A-Za-z0-9]+$/.test(paymentId)) {
    throw new Error("Invalid Razorpay payment id");
  }

  const [payment, refunds] = await Promise.all([
    razorpayGet<RazorpayPaymentEntity>(`payments/${paymentId}`),
    razorpayGet<{ items?: RazorpayRefundEntity[] }>(`payments/${paymentId}/refunds`).catch(() => ({ items: [] })),
  ]);

  const acq = payment.acquirer_data ?? {};

  return {
    paymentId: payment.id,
    status: payment.status,
    method: payment.method,
    amountInRupees: payment.amount / 100,
    refundedInRupees: (payment.amount_refunded ?? 0) / 100,
    rrn: acq.rrn ?? null,
    upiTransactionId: acq.upi_transaction_id ?? null,
    bankTransactionId: acq.bank_transaction_id ?? null,
    authCode: acq.auth_code ?? null,
    instrument: describeInstrument(payment),
    paidAt: new Date(payment.created_at * 1000).toISOString(),
    refunds: (refunds.items ?? []).map((r) => ({
      refundId: r.id,
      amountInRupees: r.amount / 100,
      status: r.status,
      bankReference: r.acquirer_data?.arn ?? r.acquirer_data?.rrn ?? r.acquirer_data?.utr ?? null,
      createdAt: new Date(r.created_at * 1000).toISOString(),
    })),
  };
}
