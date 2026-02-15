import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { sendMail } from "@/lib/mail";

export async function POST(req: NextRequest) {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await req.json();

        const body = razorpay_order_id + "|" + razorpay_payment_id;

        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAYX_KEY_SECRET!)
            .update(body.toString())
            .digest("hex");

        const isAuthentic = expectedSignature === razorpay_signature;

        if (isAuthentic) {
            const order = await prisma.order.findUnique({
                where: { razorpayId: razorpay_order_id },
                include: {
                    orderItems: {
                        include: {
                            product: {
                                include: {
                                    seller: true
                                }
                            }
                        }
                    },
                    buyer: true
                }
            });

            if (order) {
                await prisma.payment.create({
                    data: {
                        paymentId: razorpay_payment_id,
                        orderId: order.id,
                        status: "COMPLETED",
                        amount: order.totalAmount
                    }
                });

                // Update order status to WAITING_FOR_TRANSFER and start Seller Timer (60 mins)
                await prisma.order.update({
                    where: { id: order.id },
                    data: {
                        status: "WAITING_FOR_TRANSFER",
                        transferStartedAt: new Date()
                    }
                });

                // Update product status and send email
                for (const item of order.orderItems) {
                    await prisma.products.update({
                        where: { id: item.productId },
                        data: { isSold: true }
                    });

                    const sellerEmail = item.product.seller.email;
                    if (sellerEmail) {
                        await sendMail({
                            to: sellerEmail,
                            subject: `Action Required: Transfer Ticket for "${item.product.name}"`,
                            html: `
                                <h1>Your product has been sold!</h1>
                                <p>Great news! Your product <strong>${item.product.name}</strong> has been purchased by ${order.buyer.name || 'a user'}.</p>
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
                                    <li>Complete the transfer via the ticket partner app (${order.ticketPartner || 'User specified'}).</li>
                                    <li>Upload the screen recording of the transfer as evidence within 90 minutes.</li>
                                </ol>
                                <p><strong>Important:</strong> Failure to transfer within the time limit may result in order cancellation.</p>
                            `
                        });
                    }
                }
            }

            return NextResponse.json({ message: "Payment verified successfully" }, { status: 200 });
        } else {
            return NextResponse.json({ message: "Invalid signature" }, { status: 400 });
        }
    } catch (error) {
        console.error("Error verifying payment:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
