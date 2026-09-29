import { NextRequest, NextResponse } from "next/server";

import { getCurrentDbUser } from "@/lib/current-db-user";
import { prisma } from "@/lib/db";

const MAX_MESSAGE_LENGTH = 2000;

type RouteContext = { params: Promise<{ conversationId: string }> };

async function loadConversationForMember(conversationId: string, userId: string) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: { participants: { select: { id: true } } },
  });

  if (!conversation) {
    return { error: NextResponse.json({ error: "Conversation not found" }, { status: 404 }) };
  }

  if (!conversation.participants.some((p) => p.id === userId)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { conversation };
}

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const me = await getCurrentDbUser();
  if (!me) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { conversationId } = await params;
  const { error } = await loadConversationForMember(conversationId, me.id);
  if (error) return error;

  const messages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(messages);
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  const me = await getCurrentDbUser();
  if (!me) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { conversationId } = await params;
  const body = await req.json().catch(() => null);
  const content = typeof body?.content === "string" ? body.content.trim() : "";

  if (!content) {
    return NextResponse.json({ error: "Content is required" }, { status: 400 });
  }
  if (content.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json(
      { error: `Messages can be at most ${MAX_MESSAGE_LENGTH} characters` },
      { status: 400 }
    );
  }

  const { conversation, error } = await loadConversationForMember(conversationId, me.id);
  if (error) return error;

  // The receiver is always the other participant; a client-supplied
  // receiver id is ignored so messages can't be addressed to outsiders.
  const receiver = conversation.participants.find((p) => p.id !== me.id);
  if (!receiver) {
    return NextResponse.json({ error: "Receiver not found" }, { status: 400 });
  }

  const [message] = await prisma.$transaction([
    prisma.message.create({
      data: {
        content,
        senderId: me.id,
        receiverId: receiver.id,
        conversationId,
        isRead: false,
      },
    }),
    prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    }),
  ]);

  return NextResponse.json(message);
}
