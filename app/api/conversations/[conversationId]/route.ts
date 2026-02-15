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
            participants: true
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

    return NextResponse.json(conversation);
}
