import { requireAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { fetchPaymentBankDetails, type PaymentBankDetails } from "@/lib/razorpay-payment-details";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ disputeId: string }> }
) {
  const admin = await requireAdminSession();
  if (!admin) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { disputeId } = await params;
  const dispute = await prisma.dispute.findUnique({
    where: { id: disputeId },
    include: {
      order: {
        include: {
          statusHistory: { orderBy: { createdAt: "asc" } },
          buyer: { select: { id: true, name: true, email: true, phone: true, whatsappNumber: true } },
          payment: { select: { paymentId: true, status: true } },
          orderItems: {
            include: {
              product: {
                include: {
                  seller: { select: { id: true, name: true, email: true, phone: true, whatsappNumber: true, fundAccountId: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!dispute) {
    return NextResponse.json({ message: "Dispute not found" }, { status: 404 });
  }

  // Live bank references from Razorpay (RRN, UPI/bank txn ids, refund ARNs).
  // A Razorpay outage must not block the case view, so failures are reported
  // alongside the dispute instead of failing the request.
  let razorpayPayment: PaymentBankDetails | null = null;
  let razorpayPaymentError: string | null = null;
  const paymentId = dispute.order.payment?.paymentId;
  if (paymentId) {
    try {
      razorpayPayment = await fetchPaymentBankDetails(paymentId);
    } catch (error) {
      console.error(`Razorpay lookup failed for payment ${paymentId}:`, error);
      razorpayPaymentError = error instanceof Error ? error.message : "Could not reach Razorpay";
    }
  }

  return NextResponse.json({ ...dispute, razorpayPayment, razorpayPaymentError });
}
