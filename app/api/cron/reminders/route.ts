import { prisma } from "@/lib/db";
import { getOrderPortalUrl } from "@/lib/app-url";
import {
  BUYER_AUTO_CONFIRM_MINUTES,
  EVIDENCE_TIMEOUT_MINUTES,
  SELLER_TIMEOUT_MINUTES,
  createNotificationRecord,
  normalizeOrderStatus,
  recordOrderStatus,
} from "@/lib/order-flow";
import { sendNotification } from "@/lib/notifications";
import { createBuyerRefund, createSellerPayout } from "@/lib/razorpay-money-flow";
import { NextRequest, NextResponse } from "next/server";

const ADMIN_EMAIL = "writeatul2002@gmail.com";

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const dryRun = searchParams.get("dryRun") === "true";
    const orderId = searchParams.get("orderId");
    const now = new Date();

    const orders = await prisma.order.findMany({
      where: {
        ...(orderId ? { id: orderId } : {}),
        status: {
          in: ["FUNDS_HELD", "TRANSFER_IN_PROGRESS", "AWAITING_CONFIRMATION"],
        },
      },
      include: {
        buyer: true,
        payment: true,
        orderItems: {
          include: {
            product: {
              include: {
                seller: true,
              },
            },
          },
        },
      },
    });

    const results = {
      dryRun,
      inspected: 0,
      sellerTimeouts: 0,
      evidenceTimeouts: 0,
      buyerAutoCompletes: 0,
      reminders: 0,
    };

    for (const order of orders) {
      results.inspected += 1;
      const status = normalizeOrderStatus(order.status);
      const seller = order.orderItems[0]?.product.seller;
      const orderPortalUrl = getOrderPortalUrl(order.id);

      if (!seller) {
        continue;
      }

      if (status === "FUNDS_HELD" && order.transferPendingAt) {
        const deadline = new Date(order.transferPendingAt.getTime() + SELLER_TIMEOUT_MINUTES * 60 * 1000);
        const minutesLeft = Math.ceil((deadline.getTime() - now.getTime()) / 60000);

        if (now >= deadline) {
          results.sellerTimeouts += 1;

          if (!dryRun) {
            if (!order.payment?.paymentId) {
              throw new Error(`Captured payment record not found for order ${order.id}`);
            }

            const refund = await createBuyerRefund({
              paymentId: order.payment.paymentId,
              amountInRupees: order.totalAmount,
              orderId: order.id,
            });

            await prisma.$transaction(async (tx) => {
              await tx.order.update({
                where: { id: order.id },
                data: { status: "SELLER_TIMEOUT" },
              });

              await recordOrderStatus(tx, {
                orderId: order.id,
                fromStatus: status,
                toStatus: "SELLER_TIMEOUT",
                note: `Automated seller initiation timeout. Refund ${refund.id} accepted with status ${refund.status}.`,
              });

              await createNotificationRecord(tx, {
                userId: order.buyerId,
                orderId: order.id,
                title: "Seller timeout",
                message: "Seller did not initiate transfer in time. Your payment should be refunded.",
              });

              await createNotificationRecord(tx, {
                userId: seller.id,
                orderId: order.id,
                title: "Transfer window expired",
                message: "You did not initiate transfer within 30 minutes. This transaction has been cancelled.",
              });
            });

            await Promise.allSettled([
              sendNotification({
                email: order.buyer.email,
                phone: order.buyer.phone,
                subject: `Seller timeout for order ${order.id}`,
                html: `<p>Seller did not initiate transfer in time. Your refund has been initiated.</p><p><strong>Refund ID:</strong> ${refund.id}</p><p><strong>Refund Status:</strong> ${refund.status}</p><p><a href="${orderPortalUrl}">Open order in Vault</a></p>`,
              }),
              sendNotification({
                email: seller.email,
                phone: seller.phone,
                subject: `Transfer window expired for order ${order.id}`,
                html: `<p>You did not initiate transfer within 30 minutes. The transaction has been cancelled.</p><p><a href="${orderPortalUrl}">Open order in Vault</a></p>`,
              }),
              sendNotification({
                email: ADMIN_EMAIL,
                subject: `[ADMIN] Seller timeout ${order.id}`,
                html: `<p>Seller timeout triggered for order ${order.id}.</p><p><a href="${orderPortalUrl}">Open order in Vault</a></p>`,
              }),
            ]);
          }

          continue;
        }

        if ([20, 10, 5].includes(minutesLeft) && !dryRun) {
          results.reminders += 1;
          await sendNotification({
            email: seller.email,
            phone: seller.phone,
            subject: `Reminder: initiate transfer for order ${order.id}`,
            html: `<p>You have ${minutesLeft} minutes left to initiate transfer for ${order.orderItems[0]?.product.name}.</p><p><a href="${orderPortalUrl}">Open order in Vault</a></p>`,
          });
        }

        continue;
      }

      if (status === "TRANSFER_IN_PROGRESS" && order.transferStartedAt) {
        const deadline = new Date(order.transferStartedAt.getTime() + EVIDENCE_TIMEOUT_MINUTES * 60 * 1000);
        const minutesLeft = Math.ceil((deadline.getTime() - now.getTime()) / 60000);

        if (now >= deadline) {
          results.evidenceTimeouts += 1;

          if (!dryRun) {
            await prisma.$transaction(async (tx) => {
              await tx.order.update({
                where: { id: order.id },
                data: { status: "EVIDENCE_TIMEOUT" },
              });

              await recordOrderStatus(tx, {
                orderId: order.id,
                fromStatus: status,
                toStatus: "EVIDENCE_TIMEOUT",
                note: "Automated evidence upload timeout",
              });

              await createNotificationRecord(tx, {
                userId: order.buyerId,
                orderId: order.id,
                title: "Evidence timeout",
                message: "Seller did not upload evidence in time. Vault will review this transaction manually.",
              });

              await createNotificationRecord(tx, {
                userId: seller.id,
                orderId: order.id,
                title: "Evidence upload timed out",
                message: "You did not upload evidence within 15 minutes. Vault will review this transaction manually.",
              });
            });
          }

          continue;
        }

        if ([10, 5, 1].includes(minutesLeft) && !dryRun) {
          results.reminders += 1;
          await sendNotification({
            email: seller.email,
            phone: seller.phone,
            subject: `Reminder: upload evidence for order ${order.id}`,
            html: `<p>You have ${minutesLeft} minutes left to upload transfer evidence for ${order.orderItems[0]?.product.name}.</p><p><a href="${orderPortalUrl}">Open order in Vault</a></p>`,
          });
        }

        continue;
      }

      if (status === "AWAITING_CONFIRMATION" && order.evidenceUploadedAt) {
        const deadline = new Date(order.evidenceUploadedAt.getTime() + BUYER_AUTO_CONFIRM_MINUTES * 60 * 1000);
        const minutesLeft = Math.ceil((deadline.getTime() - now.getTime()) / 60000);

        if (now >= deadline) {
          results.buyerAutoCompletes += 1;

          if (!dryRun) {
            if (!seller.fundAccountId) {
              throw new Error(`Seller payout account is not configured for order ${order.id}`);
            }

            const sellerGross = order.orderItems.reduce((sum, item) => sum + item.price, 0);
            const sellerNetPayout = Math.max(0, sellerGross - (order.platformFeeSeller || 0));
            const payout = await createSellerPayout({
              fundAccountId: seller.fundAccountId,
              amountInRupees: sellerNetPayout,
              orderId: order.id,
            });

            await prisma.$transaction(async (tx) => {
              await tx.order.update({
                where: { id: order.id },
                data: {
                  status: "COMPLETE",
                  buyerConfirmedAt: new Date(),
                },
              });

              await recordOrderStatus(tx, {
                orderId: order.id,
                fromStatus: status,
                toStatus: "COMPLETE",
                note: `Automated buyer no-response completion. Payout ${payout.id} accepted with status ${payout.status}.`,
              });

              await createNotificationRecord(tx, {
                userId: seller.id,
                orderId: order.id,
                title: "Buyer confirmation timed out",
                message: "Buyer did not respond within 10 minutes. The order has been completed and your payout has been initiated.",
              });
            });
          }

          continue;
        }

        if ([5, 2, 1].includes(minutesLeft) && !dryRun) {
          results.reminders += 1;
          await sendNotification({
            email: order.buyer.email,
            phone: order.buyer.phone,
            subject: `Reminder: confirm receipt for order ${order.id}`,
            html: `<p>You have ${minutesLeft} minutes left to confirm receipt or raise a dispute for ${order.orderItems[0]?.product.name}.</p><p><a href="${orderPortalUrl}">Open order in Vault</a></p>`,
          });
        }
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (error: unknown) {
    console.error("Cron error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
  }
}
