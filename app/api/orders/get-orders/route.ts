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
                OR: [
                    { buyerId: existingUser.id },
                    {
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
                        product: true
                    }
                },
                buyer: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        return NextResponse.json({ result: { orders, existingUser } }, { status: 200 })
    } catch (error) {
        return NextResponse.json({ message: "Internal server error" }, { status: 500 })
    }
}