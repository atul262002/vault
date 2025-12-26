import { prisma } from "@/lib/db";
import { currentUser } from "@clerk/nextjs/server";
import { NextResponse, NextRequest } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const user = await currentUser();
        if (!user?.emailAddresses[0]?.emailAddress) {
            return NextResponse.json({ message: "Unauthorized user" }, { status: 401 });
        }

        const userEmail = user.emailAddresses[0].emailAddress;
        let existingUser = await prisma.user.findUnique({
            where: { email: userEmail }
        });

        if (!existingUser) {
            return NextResponse.json({ message: "Unauthourized user" }, { status: 401 })
        }
        const body = await req.json();
        const { receiverId, content, productId } = body;

        if (!user || !receiverId || !content) {
            return NextResponse.json({ error: "Missing fields" }, { status: 400 });
        }

        if (receiverId === existingUser.id) {
            const existingChat = await prisma.message.findFirst({
                where: {
                    productId
                }
            })

            const message = await prisma.message.create({
                data: {
                    productId,
                    receiverId: existingChat?.senderId || "",
                    senderId: existingChat?.receiverId || "",
                    content
                }
            })

            return NextResponse.json(message, { status: 201 });
        }

        const message = await prisma.message.create({
            data: {
                content,
                senderId: existingUser.id,
                receiverId,
                productId: productId
            },
        });

        return NextResponse.json(message, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
    }
}
