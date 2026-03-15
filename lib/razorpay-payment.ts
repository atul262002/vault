import { prisma } from "@/lib/db";
import { sendMail } from "@/lib/mail";

type CompleteOrderPaymentParams = {
  razorpayOrderId: string;
  razorpayPaymentId: string;
};

export async function completeOrderPayment({
  razorpayOrderId,
  razorpayPaymentId,
}: CompleteOrderPaymentParams) {
  const order = await prisma.order.findUnique({
    where: { razorpayId: razorpayOrderId },
    include: {
      orderItems: {
        include: {
          product: {
            include: {
              seller: true,
            },
          },
        },
      },
      buyer: true,
      payment: true,
    },
  });

  if (!order) {
    return { ok: false as const, status: 404, message: "Order not found" };
  }

  const isFirstSuccessfulCompletion = !order.payment;

  if (!order.payment) {
    await prisma.payment.create({
      data: {
        paymentId: razorpayPaymentId,
        orderId: order.id,
        status: "COMPLETED",
        amount: order.totalAmount,
      },
    });
  } else if (order.payment.paymentId !== razorpayPaymentId) {
    await prisma.payment.update({
      where: { orderId: order.id },
      data: {
        paymentId: razorpayPaymentId,
        status: "COMPLETED",
        amount: order.totalAmount,
      },
    });
  } else if (order.payment.status !== "COMPLETED") {
    await prisma.payment.update({
      where: { orderId: order.id },
      data: {
        status: "COMPLETED",
        amount: order.totalAmount,
      },
    });
  }

  if (order.status === "PENDING" || !order.transferStartedAt) {
    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: "WAITING_FOR_TRANSFER",
        transferStartedAt: order.transferStartedAt ?? new Date(),
        lastSellerReminderSentAt: null,
        lastBuyerReminderSentAt: null,
      },
    });
  }

  for (const item of order.orderItems) {
    if (!item.product.isSold) {
      await prisma.products.update({
        where: { id: item.productId },
        data: { isSold: true },
      });
    }
  }

  if (isFirstSuccessfulCompletion) {
    for (const item of order.orderItems) {
      const sellerEmail = item.product.seller.email;

      if (!sellerEmail) {
        continue;
      }

      await sendMail({
        to: sellerEmail,
        subject: `Action Required: Transfer Ticket for "${item.product.name}"`,
        html: `
            <h1>Your product has been sold!</h1>
            <p>Great news! Your product <strong>${item.product.name}</strong> has been purchased by ${order.buyer.name || "a user"}.</p>
            <p><strong>Order ID:</strong> ${order.id}</p>
            <p><strong>Amount Paid by Buyer:</strong> ₹${order.totalAmount}</p>
            <p><strong>Platform Fee (Buyer):</strong> ₹${order.platformFeeBuyer}</p>
            <p><strong>Platform Fee (Seller):</strong> ₹${order.platformFeeSeller}</p>
            <p><strong>Your Net Payout:</strong> ₹${item.price - order.platformFeeSeller}</p>
            <br/>
            <h2>Next Steps:</h2>
            <ol>
                <li>Login to your dashboard and go to the Order page.</li>
                <li>Click on "Initiate Transfer".</li>
                <li>Complete the transfer via the ticket partner app (${order.ticketPartner || "User specified"}).</li>
                <li>Upload the screen recording of the transfer as evidence within 60 minutes.</li>
            </ol>
            <p><strong>Important:</strong> Failure to transfer within the time limit may result in order cancellation.</p>
        `,
      });
    }
  }

  return {
    ok: true as const,
    status: 200,
    message: "Payment completed successfully",
    orderId: order.id,
  };
}
