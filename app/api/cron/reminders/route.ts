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
            buyerReminders: 0,
            errors: 0
        };

        // ---------------------------------------------------------
        // 1. SELLER TIMERS (60 mins)
        // Status: WAITING_FOR_TRANSFER or TRANSFER_INITIATED
        // ---------------------------------------------------------
        const sellerOrders = await prisma.order.findMany({
            where: {
                status: { in: ["WAITING_FOR_TRANSFER", "TRANSFER_INITIATED"] },
                transferStartedAt: { not: null }
            },
            include: { orderItems: { include: { product: { include: { seller: true } } } } }
        });

        for (const order of sellerOrders) {
            if (!order.transferStartedAt) continue;

            const startTime = new Date(order.transferStartedAt).getTime();
            const elapsed = now.getTime() - startTime;
            const elapsedMinutes = Math.floor(elapsed / 60000);
            const duration = 60; // 60 minutes
            const timeLeft = duration - elapsedMinutes;

            let shouldSend = false;
            let type = "regular";

            // 5-minute Warning
            if (timeLeft <= 5 && timeLeft > 0) {
                // Check if we already sent a reminder recently (within last 4 mins) to avoid double sending
                // @ts-ignore
                const lastSent = order.lastReminderSentAt ? new Date(order.lastReminderSentAt).getTime() : 0;
                if (now.getTime() - lastSent > 4 * 60000) {
                    shouldSend = true;
                    type = "warning";
                }
            }
            // 10-minute Recurring
            else if (elapsedMinutes > 0 && elapsedMinutes % 10 === 0) {
                // Check if we already sent this specific 10-min reminder
                // @ts-ignore
                const lastSent = order.lastReminderSentAt ? new Date(order.lastReminderSentAt).getTime() : 0;
                if (now.getTime() - lastSent > 9 * 60000) {
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
        // ---------------------------------------------------------
        const buyerOrders = await prisma.order.findMany({
            where: {
                status: "EVIDENCE_UPLOADED",
                evidenceUploadedAt: { not: null }
            },
            include: { buyer: true }
        });

        for (const order of buyerOrders) {
            if (!order.evidenceUploadedAt) continue;

            const startTime = new Date(order.evidenceUploadedAt).getTime();
            const elapsed = now.getTime() - startTime;
            const elapsedMinutes = Math.floor(elapsed / 60000);
            const duration = 30; // 30 minutes
            const timeLeft = duration - elapsedMinutes;

            let shouldSend = false;
            let type = "regular";

            // 5-minute Warning
            if (timeLeft <= 5 && timeLeft > 0) {
                // @ts-ignore
                const lastSent = order.lastReminderSentAt ? new Date(order.lastReminderSentAt).getTime() : 0;
                if (now.getTime() - lastSent > 4 * 60000) {
                    shouldSend = true;
                    type = "warning";
                }
            }
            // 10-minute Recurring
            else if (elapsedMinutes > 0 && elapsedMinutes % 10 === 0) {
                // @ts-ignore
                const lastSent = order.lastReminderSentAt ? new Date(order.lastReminderSentAt).getTime() : 0;
                if (now.getTime() - lastSent > 9 * 60000) {
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

    const actionText = role === "Seller"
        ? "Please transfer the tickets and upload evidence."
        : "Please confirm receipt of tickets.";

    const html = `
        <h1>Action Required</h1>
        <p>${actionText}</p>
        <p><strong>Time Remaining:</strong> ${timeLeft} minutes</p>
        <p>Failure to complete this action may result in order cancellation or penalties.</p>
        <br/>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/orders/${orderId}">Go to Order</a>
    `;

    await import("@/lib/mail").then(({ sendMail }) => sendMail({ to, subject, html }));
}
