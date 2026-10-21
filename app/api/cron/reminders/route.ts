import { timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/db";
import { getOrderPortalUrl } from "@/lib/app-url";
import {
  BUYER_AUTO_CONFIRM_MINUTES,
  EVIDENCE_TIMEOUT_MINUTES,
  SELLER_TIMEOUT_MINUTES,
  createNotificationRecord,
  decrementProductInventory,
  normalizeOrderStatus,
  recordOrderStatus,
} from "@/lib/order-flow";
import { escapeHtml, getAdminEmail } from "@/lib/mail";
import { withLockedOrder } from "@/lib/order-lock";
import {
  BUYER_CONFIRM_REMINDERS,
  SELLER_EVIDENCE_REMINDERS,
  SELLER_TRANSFER_REMINDERS,
  claimDueReminder,
} from "@/lib/reminders";
import { expireStaleCheckouts } from "@/lib/checkout-release";
import { sendNotification } from "@/lib/notifications";
import {
  createBuyerRefund,
  createSellerPayout,
} from "@/lib/razorpay-money-flow";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    // This endpoint moves money (payouts/refunds), so it fails closed: with
    // no CRON_SECRET configured, nobody can call it.
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      console.error(
        "CRON_SECRET is not configured; refusing to run the reminders job.",
      );
      return NextResponse.json(
        { message: "Cron is not configured" },
        { status: 503 },
      );
    }

    const authHeader = req.headers.get("authorization") ?? "";
    const expected = Buffer.from(`Bearer ${cronSecret}`);
    const provided = Buffer.from(authHeader);
    if (
      provided.length !== expected.length ||
      !timingSafeEqual(provided, expected)
    ) {
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
      failed: [] as Array<{ orderId: string; error: string }>,
    };

    for (const order of orders) {
      // Each order is processed in isolation: one failure (e.g. a payout
      // error or a seller without a payout account) must not stop every
      // other order from being processed on this run and all later runs.
      try {
        results.inspected += 1;
        const status = normalizeOrderStatus(order.status);
        const seller = order.orderItems[0]?.product.seller;
        const orderPortalUrl = getOrderPortalUrl(order.id);

        if (!seller) {
          continue;
        }

        if (status === "FUNDS_HELD" && order.transferPendingAt) {
          const deadline = new Date(
            order.transferPendingAt.getTime() +
              SELLER_TIMEOUT_MINUTES * 60 * 1000,
          );

          if (now >= deadline) {
            results.sellerTimeouts += 1;

            if (!dryRun) {
              if (!order.payment?.paymentId) {
                throw new Error(
                  `Captured payment record not found for order ${order.id}`,
                );
              }

              const paymentId = order.payment.paymentId;
              // Locked: the seller may start the transfer, or the buyer
              // cancel, at the same moment this job fires.
              const refund = await withLockedOrder(
                order.id,
                async (tx, lockedStatus) => {
                  if (lockedStatus !== "FUNDS_HELD") {
                    return null;
                  }

                  const refund = await createBuyerRefund({
                    paymentId,
                    amountInRupees: order.totalAmount,
                    orderId: order.id,
                  });

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
                    message:
                      "Seller did not initiate transfer in time. Your payment should be refunded.",
                  });

                  await createNotificationRecord(tx, {
                    userId: seller.id,
                    orderId: order.id,
                    title: "Transfer window expired",
                    message:
                      "You did not initiate transfer within 30 minutes. This transaction has been cancelled.",
                  });

                  return refund;
                },
              );

              if (!refund) {
                continue;
              }

              await Promise.allSettled([
                sendNotification({
                  email: order.buyer.email,
                  phone: order.buyer.phone,
                  whatsappNumber: order.buyer.whatsappNumber,
                  subject: `Seller timeout for order ${order.id}`,
                  html: `<p>Seller did not initiate transfer in time. Your refund has been initiated.</p><p><strong>Refund ID:</strong> ${refund.id}</p><p><strong>Refund Status:</strong> ${refund.status}</p><p><a href="${orderPortalUrl}">Open order in Vault</a></p>`,
                  smsText: `Vault: Seller timed out for your order. Refund initiated (ID: ${refund.id}). Allow 5-7 business days.`,
                }),
                sendNotification({
                  email: seller.email,
                  phone: seller.phone,
                  whatsappNumber: seller.whatsappNumber,
                  subject: `Transfer window expired for order ${order.id}`,
                  html: `<p>You did not initiate transfer within 30 minutes. The transaction has been cancelled.</p><p><a href="${orderPortalUrl}">Open order in Vault</a></p>`,
                  smsText: `Vault: Your transfer window for order ${order.id.slice(0, 8)} has expired. The transaction has been cancelled.`,
                }),
                sendNotification({
                  email: getAdminEmail(),
                  subject: `[ADMIN] Seller timeout ${order.id}`,
                  html: `<p>Seller timeout triggered for order ${order.id}.</p><p><a href="${orderPortalUrl}">Open order in Vault</a></p>`,
                }),
              ]);
            }

            continue;
          }

          const reminderMinutes = await claimDueReminder({
            orderId: order.id,
            field: "lastSellerReminderSentAt",
            deadline: deadline,
            schedule: SELLER_TRANSFER_REMINDERS,
            now,
            dryRun,
          });
          if (reminderMinutes !== null && !dryRun) {
            const minutesLeft = reminderMinutes;
            results.reminders += 1;
            await sendNotification({
              email: seller.email,
              phone: seller.phone,
              whatsappNumber: seller.whatsappNumber,
              subject: `Reminder: ${minutesLeft} min left to start the transfer for order ${order.id.slice(0, 8)}`,
              html: `<p>Your window to start the ticket transfer for <strong>${escapeHtml(order.orderItems[0]?.product.name)}</strong> expires in <strong>${minutesLeft} minute${minutesLeft === 1 ? "" : "s"}</strong>.</p><p>If it expires, the order is cancelled and the buyer is refunded.</p><p><a href="${orderPortalUrl}">Open order in Vault</a></p>`,
              smsText: `Vault reminder: ${minutesLeft} min left to initiate transfer for order ${order.id.slice(0, 8)}. Act now to avoid cancellation.`,
            });
          }

          continue;
        }

        if (status === "TRANSFER_IN_PROGRESS" && order.transferStartedAt) {
          const deadline = new Date(
            order.transferStartedAt.getTime() +
              EVIDENCE_TIMEOUT_MINUTES * 60 * 1000,
          );

          if (now >= deadline) {
            results.evidenceTimeouts += 1;

            if (!dryRun) {
              await withLockedOrder(order.id, async (tx, lockedStatus) => {
                if (lockedStatus !== "TRANSFER_IN_PROGRESS") {
                  return;
                }

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
                  message:
                    "Seller did not upload evidence in time. Vault will review this transaction manually.",
                });

                await createNotificationRecord(tx, {
                  userId: seller.id,
                  orderId: order.id,
                  title: "Evidence upload timed out",
                  message:
                    "You did not upload evidence within 15 minutes. Vault will review this transaction manually.",
                });
              });
            }

            continue;
          }

          const reminderMinutes = await claimDueReminder({
            orderId: order.id,
            field: "lastSellerReminderSentAt",
            deadline: deadline,
            schedule: SELLER_EVIDENCE_REMINDERS,
            now,
            dryRun,
          });
          if (reminderMinutes !== null && !dryRun) {
            const minutesLeft = reminderMinutes;
            results.reminders += 1;
            await sendNotification({
              email: seller.email,
              phone: seller.phone,
              whatsappNumber: seller.whatsappNumber,
              subject: `Reminder: ${minutesLeft} min left to upload evidence for order ${order.id.slice(0, 8)}`,
              html: `<p>Your window to upload transfer evidence for <strong>${escapeHtml(order.orderItems[0]?.product.name)}</strong> expires in <strong>${minutesLeft} minute${minutesLeft === 1 ? "" : "s"}</strong>.</p><p>If it expires, the order goes to manual review and your payout is delayed.</p><p><a href="${orderPortalUrl}">Upload evidence in Vault</a></p>`,
              smsText: `Vault reminder: ${minutesLeft} min left to upload evidence for order ${order.id.slice(0, 8)}. Upload now to avoid dispute.`,
            });
          }

          continue;
        }

        if (status === "AWAITING_CONFIRMATION" && order.evidenceUploadedAt) {
          const deadline = new Date(
            order.evidenceUploadedAt.getTime() +
              BUYER_AUTO_CONFIRM_MINUTES * 60 * 1000,
          );

          if (now >= deadline) {
            results.buyerAutoCompletes += 1;

            if (!dryRun) {
              if (!seller.fundAccountId) {
                throw new Error(
                  `Seller payout account is not configured for order ${order.id}`,
                );
              }

              const sellerGross = order.orderItems.reduce(
                (sum, item) => sum + item.price,
                0,
              );
              const sellerNetPayout = Math.max(
                0,
                sellerGross - (order.platformFeeSeller || 0),
              );
              const fundAccountId = seller.fundAccountId;
              // Locked: the buyer may confirm or raise a dispute at the same
              // moment. Without the lock the seller could be paid while a
              // dispute is opened, or stock decremented twice.
              await withLockedOrder(order.id, async (tx, lockedStatus) => {
                if (lockedStatus !== "AWAITING_CONFIRMATION") {
                  return;
                }

                const payout = await createSellerPayout({
                  fundAccountId,
                  amountInRupees: sellerNetPayout,
                  orderId: order.id,
                });

                await tx.order.update({
                  where: { id: order.id },
                  data: {
                    status: "COMPLETE",
                    buyerConfirmedAt: new Date(),
                  },
                });

                await decrementProductInventory(tx, order.orderItems);

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
                  message:
                    "Buyer did not respond within 15 minutes. The order has been completed and your payout has been initiated.",
                });
              });
            }

            continue;
          }

          const reminderMinutes = await claimDueReminder({
            orderId: order.id,
            field: "lastBuyerReminderSentAt",
            deadline: deadline,
            schedule: BUYER_CONFIRM_REMINDERS,
            now,
            dryRun,
          });
          if (reminderMinutes !== null && !dryRun) {
            const minutesLeft = reminderMinutes;
            results.reminders += 1;
            await sendNotification({
              email: order.buyer.email,
              phone: order.buyer.phone,
              whatsappNumber: order.buyer.whatsappNumber,
              subject: `Action needed: order ${order.id.slice(0, 8)} auto-confirms in ${minutesLeft} min`,
              html: `<p>The seller has marked the ticket transfer for <strong>${escapeHtml(order.orderItems[0]?.product.name)}</strong> as done.</p><p>If you don't respond in the next <strong>${minutesLeft} minute${minutesLeft === 1 ? "" : "s"}</strong>, the order will be <strong>auto-confirmed</strong> and the payment released to the seller. This can't be undone.</p><p>Received the ticket? Confirm it. Didn't receive it? Raise a dispute before the timer runs out.</p><p><a href="${orderPortalUrl}">Open order in Vault</a></p>`,
              smsText: `Vault: order ${order.id.slice(0, 8)} auto-confirms in ${minutesLeft} min and payment goes to the seller. Not received the ticket? Raise a dispute now.`,
            });
          }
        }
      } catch (orderError: unknown) {
        const message =
          orderError instanceof Error ? orderError.message : String(orderError);
        console.error(`Cron failed for order ${order.id}:`, orderError);
        results.failed.push({ orderId: order.id, error: message });
      }
    }

    // Checkouts nobody released (browser crashed, phone died): complete the

    // ones that were actually paid and cancel the rest.

    let staleCheckouts: Awaited<
      ReturnType<typeof expireStaleCheckouts>
    > | null = null;

    if (!orderId) {
      try {
        staleCheckouts = await expireStaleCheckouts({ dryRun });
      } catch (error) {
        console.error("Expiring stale checkouts failed:", error);
      }
    }

    return NextResponse.json({
      success: results.failed.length === 0,
      results,
      staleCheckouts,
    });
  } catch (error: unknown) {
    console.error("Cron error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
