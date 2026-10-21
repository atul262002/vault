import { prisma } from "@/lib/db";
import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const user = await currentUser();
        if (!user?.emailAddresses[0]?.emailAddress) {
            return NextResponse.json({ message: "Unauthorized user" }, { status: 401 });
        }

        const userEmail = user.emailAddresses[0].emailAddress;

        // Upsert user to ensure they exist in DB
        const existingUser = await prisma.user.upsert({
            where: { email: userEmail },
            update: {},
            create: {
                email: userEmail,
                name: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || "User",
                isVerified: false
            }
        });

        const orders = await prisma.order.findMany({
            where: {
                // A checkout that was closed or expired without payment isn't a
                // real order; hide it so every closed payment window doesn't
                // leave a "Cancelled" card behind.
                NOT: { status: "CANCELLED", payment: null },
                OR: [
                    { buyerId: existingUser.id },
                    {
                        // Sellers only see orders once the buyer has paid.
                        status: { not: "PAYMENT_PENDING" },
                        orderItems: {
                            some: {
                                product: {
                                    sellerId: existingUser.id
                                }
                            }
                        }
                    }
                ]
            },
            include: {
                orderItems: {
                    include: {
                        product: {
                            include: {
                                category: true,
                            }
                        }
                    }
                },
                buyer: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                },
                statusHistory: {
                    orderBy: {
                        createdAt: "asc"
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        return NextResponse.json({ result: { orders, existingUser: { id: existingUser.id, email: existingUser.email } } }, { status: 200 })
    } catch {
        return NextResponse.json({ message: "Internal server error" }, { status: 500 })
    }
}
