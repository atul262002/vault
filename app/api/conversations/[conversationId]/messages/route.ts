import { prisma } from "@/lib/db";
import { currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest, { params }: { params: { conversationId: string } }) {
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

    const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
        include: {
            participants: true,
            messages: {
                orderBy: { createdAt: 'asc' }
            }
        }
    });

    if (!conversation) {
        return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    // Verify participant
    const isParticipant = conversation.participants.some(p => p.id === existingUser.id);
    if (!isParticipant) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(conversation.messages);
}

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
    const body = await req.json();
    const { content, receiverId } = body;

    if (!content) {
        return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    // We already have conversationId, so we can create message directly linked to it.
    // Also need to link sender and receiver.
    // ReceiverId might be passed or inferred?
    // If not passed, we can infer from conversation participants (the one who is not me).

    let targetReceiverId = receiverId;
    if (!targetReceiverId) {
        const conversation = await prisma.conversation.findUnique({
            where: { id: conversationId },
            include: { participants: true }
        });
        if (!conversation) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });

        const otherParticipant = conversation.participants.find(p => p.id !== existingUser.id);
        if (!otherParticipant) return NextResponse.json({ error: "Receiver not found" }, { status: 400 });
        targetReceiverId = otherParticipant.id;
    }

    const message = await prisma.message.create({
        data: {
            content,
            senderId: existingUser.id,
            receiverId: targetReceiverId,
            conversationId: conversationId,
            isRead: false
        }
    });

    return NextResponse.json(message);
}
