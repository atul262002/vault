import { prisma } from "@/lib/db";
import { currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest, { params }: { params: { userId: string } }) {
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

    const otherUserId = await params.userId;
    if (!user || !otherUserId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const messages = await prisma.message.findMany({
        where: {
            OR: [
                { senderId: existingUser.id, receiverId: otherUserId },
                { senderId: otherUserId, receiverId: existingUser.id },
            ],
        },
        orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(messages);
}
