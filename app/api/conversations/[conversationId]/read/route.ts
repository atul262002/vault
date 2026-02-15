import { prisma } from "@/lib/db";
import { currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest, { params }: { params: { conversationId: string } }) {
    const user = await currentUser();
    if (!user?.emailAddresses[0]?.emailAddress) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const email = user.emailAddresses[0].emailAddress;
    const existingUser = await prisma.user.findUnique({
        where: { email },
    });

    if (!existingUser) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { conversationId } = await params;

    // Verify user is participant
    const conversation = await prisma.conversation.findFirst({
        where: {
            id: conversationId,
            participants: { some: { id: existingUser.id } }
        }
    });

    if (!conversation) {
        return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    // Mark messages as read where receiver is current user
    await prisma.message.updateMany({
        where: {
            conversationId,
            receiverId: existingUser.id,
            isRead: false
        },
        data: {
            isRead: true
        }
    });

    return NextResponse.json({ success: true });
}
