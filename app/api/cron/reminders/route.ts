import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// CRON JOB: Hit this endpoint every 1 minute
export async function GET(req: NextRequest) {
    try {
        // Authenticate Cron Request (optional, use a secret header)
        const authHeader = req.headers.get('authorization');
        if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const now = new Date();
        const results = {
            sellerReminders: 0,
            sellerTimeouts: 0,
            buyerReminders: 0,
            buyerTimeouts: 0,
            errors: 0
        };

        const ADMIN_EMAIL = "admin@vault.com"; // Hardcoded Admin Email

        // ---------------------------------------------------------
        // 1. SELLER TIMERS (60 mins)
        // Status: WAITING_FOR_TRANSFER (and TRANSFER_INITIATED if evidence not uploaded)
        // Timeout starts at: transferStartedAt (set when payment verified)
        // ---------------------------------------------------------
        const sellerOrders = await prisma.order.findMany({
            where: {
                status: { in: ["WAITING_FOR_TRANSFER", "TRANSFER_INITIATED"] },
                transferStartedAt: { not: null }
            },
            include: { orderItems: { include: { product: { include: { seller: true } } } }, buyer: true }
        });

        for (const order of sellerOrders) {
            if (!order.transferStartedAt) continue;

            const startTime = new Date(order.transferStartedAt).getTime();
            const elapsed = now.getTime() - startTime;
            const elapsedMinutes = Math.floor(elapsed / 60000);
            const duration = 60; // 60 minutes
            const timeLeft = duration - elapsedMinutes;

            // Scenario A: TIMEOUT EXPIRED (Seller failed)
            if (timeLeft <= 0) {
                // Update Status to DISPUTED (User requested "Conflict")
                await prisma.order.update({
                    where: { id: order.id },
                    data: { status: "DISPUTED" }
                });

                // Notify ALL (Seller, Buyer, Admin)
                await import("@/lib/mail").then(({ sendMail }) => {
                    const subject = `Order #${order.id} DISPUTED: Seller Timeout`;
                    const htmlBase = `
                        <h1>Order Marked as Disputed</h1>
                        <p>The seller failed to complete the transfer/evidence upload within the 60-minute window.</p>
                        <p><strong>Order ID:</strong> ${order.id}</p>
                    `;

                    // To Seller
                    const seller = order.orderItems[0].product.seller;
                    if (seller.email) {
                        sendMail({
                            to: seller.email,
                            subject,
                            html: `${htmlBase}<p>You failed to upload evidence in time. The order is now disputed.</p>`
                        });
                    }

                    // To Buyer
                    if (order.buyer.email) {
                        sendMail({
                            to: order.buyer.email,
                            subject,
                            html: `${htmlBase}<p>We have marked this order as disputed. Support will review it shortly for a potential refund.</p>`
                        });
                    }

                    // To Admin
                    sendMail({
                        to: ADMIN_EMAIL,
                        subject: `[ADMIN] Conflict Alert: Order #${order.id}`,
                        html: `${htmlBase}<p>Seller failed to perform action. Please review for refund/resolution.</p>`
                    });
                });

                results.sellerTimeouts++;
                continue; // Skip reminder logic for this order
            }

            // Scenario B: REMINDERS (Every 10 mins OR Last 5 mins)
            let shouldSend = false;
            let type = "regular";

            // @ts-ignore
            const lastSent = order.lastReminderSentAt ? new Date(order.lastReminderSentAt).getTime() : 0;
            const timeSinceLastSent = now.getTime() - lastSent;

            // 1. Critical Warning (Last 5 mins)
            if (timeLeft <= 5 && timeLeft > 0) {
                // Send if we haven't sent a warning recently (avoid spamming every minute in the last 5)
                if (timeSinceLastSent > 4 * 60000) {
                    shouldSend = true;
                    type = "warning";
                }
            }
            // 2. Regular Reminder (Every 10 mins: 10, 20, 30, 40, 50)
            else if (elapsedMinutes > 0) {
                // Check if we hit a 10-minute mark relative to start
                // logic: if (elapsedMinutes % 10 === 0) -> this might be missed if cron is slightly off.
                // Better: check if time since last reminder >= 10 mins.
                // Initial: if lastSent is 0, check if elapsed >= 10.

                const timeReference = lastSent > 0 ? lastSent : startTime;
                if (now.getTime() - timeReference >= 10 * 60000) {
                    shouldSend = true;
                    type = "regular";
                }
            }

            if (shouldSend) {
                const seller = order.orderItems[0].product.seller;
                if (seller.email) {
                    await sendReminderEmail(seller.email, "Seller", type, timeLeft, order.id);
                    await prisma.order.update({
                        where: { id: order.id },
                        data: {
                            // @ts-ignore
                            lastReminderSentAt: now
                        }
                    });
                    results.sellerReminders++;
                }
            }
        }

        // ---------------------------------------------------------
        // 2. BUYER TIMERS (30 mins)
        // Status: EVIDENCE_UPLOADED
        // Timeout starts at: evidenceUploadedAt
        // ---------------------------------------------------------
        const buyerOrders = await prisma.order.findMany({
            where: {
                status: "EVIDENCE_UPLOADED",
                evidenceUploadedAt: { not: null }
            },
            include: { buyer: true, orderItems: { include: { product: { include: { seller: true } } } } }
        });

        for (const order of buyerOrders) {
            if (!order.evidenceUploadedAt) continue;

            const startTime = new Date(order.evidenceUploadedAt).getTime();
            const elapsed = now.getTime() - startTime;
            const elapsedMinutes = Math.floor(elapsed / 60000);
            const duration = 30; // 30 minutes
            const timeLeft = duration - elapsedMinutes;

            // Scenario A: TIMEOUT EXPIRED (Buyer Silent -> Auto Complete)
            if (timeLeft <= 0) {
                // Update Status to COMPLETED
                const updatedOrder = await prisma.order.update({
                    where: { id: order.id },
                    data: {
                        status: "COMPLETED",
                        buyerConfirmedAt: new Date()
                    }
                });

                // Notify ALL
                await import("@/lib/mail").then(({ sendMail }) => {
                    const subject = `Order #${order.id} COMPLETED: Auto-Confirmation`;
                    const htmlBase = `
                        <h1>Order Completed</h1>
                        <p>The buyer did not confirm within the 30-minute window. The order has been auto-completed.</p>
                        <p><strong>Order ID:</strong> ${order.id}</p>
                    `;

                    // To Buyer
                    if (order.buyer.email) {
                        sendMail({
                            to: order.buyer.email,
                            subject,
                            html: `${htmlBase}<p>Funds have been released to the seller.</p>`
                        });
                    }

                    // To Seller
                    const seller = order.orderItems[0].product.seller;
                    if (seller.email) {
                        sendMail({
                            to: seller.email,
                            subject,
                            html: `${htmlBase}<p>Funds will be released to your account shortly.</p>`
                        });
                    }

                    // To Admin
                    sendMail({
                        to: ADMIN_EMAIL,
                        subject: `[ADMIN] Order Completed: Order #${order.id}`,
                        html: `${htmlBase}<p>Auto-completed due to buyer silence.</p>`
                    });
                });

                results.buyerTimeouts++;
                continue;
            }

            // Scenario B: REMINDERS
            let shouldSend = false;
            let type = "regular";

            // @ts-ignore
            const lastSent = order.lastReminderSentAt ? new Date(order.lastReminderSentAt).getTime() : 0;
            const timeSinceLastSent = now.getTime() - lastSent;

            // 1. Critical Warning (Last 5 mins)
            if (timeLeft <= 5 && timeLeft > 0) {
                if (timeSinceLastSent > 4 * 60000) {
                    shouldSend = true;
                    type = "warning";
                }
            }
            // 2. Regular Reminder (Every 10 mins)
            else if (elapsedMinutes > 0) {
                const timeReference = lastSent > 0 ? lastSent : startTime;
                if (now.getTime() - timeReference >= 10 * 60000) {
                    shouldSend = true;
                    type = "regular";
                }
            }

            if (shouldSend) {
                if (order.buyer.email) {
                    await sendReminderEmail(order.buyer.email, "Buyer", type, timeLeft, order.id);
                    await prisma.order.update({
                        where: { id: order.id },
                        data: {
                            // @ts-ignore
                            lastReminderSentAt: now
                        }
                    });
                    results.buyerReminders++;
                }
            }
        }

        return NextResponse.json({ success: true, results });

    } catch (error: any) {
        console.error("Cron Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

async function sendReminderEmail(to: string, role: string, type: string, timeLeft: number, orderId: string) {
    const subject = type === "warning"
        ? `URGENT: ${timeLeft} Minutes Left to Complete Order #${orderId}`
        : `Action Reminder: Order #${orderId}`;

    let actionText = "";
    if (role === "Seller") {
        actionText = "Please transfer the tickets and upload evidence immediately.";
    } else {
        actionText = "Please confirm receipt of tickets or report an issue.";
    }

    const html = `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2 style="color: ${type === 'warning' ? '#d9534f' : '#333'};">
                ${type === 'warning' ? 'Urgent Action Required' : 'Action Required'}
            </h2>
            <p>${actionText}</p>
            <div style="background: #f8f9fa; padding: 15px; margin: 20px 0; border-radius: 5px;">
                <p style="margin: 0; font-size: 18px;"><strong>Time Remaining:</strong> ${timeLeft} minutes</p>
            </div>
            <p>Failure to complete this action will result in automatic resolution (Dispute or Auto-Completion).</p>
            <br/>
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/orders" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Go to My Orders</a>
        </div>
    `;

    await import("@/lib/mail").then(({ sendMail }) => sendMail({ to, subject, html }));
}
