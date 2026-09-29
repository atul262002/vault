import { prisma } from '@/lib/db';
import { currentUser } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  const user = await currentUser();
  const email = user?.emailAddresses[0]?.emailAddress;

  if (!email) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (!existingUser) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const conversations = await prisma.conversation.findMany({
    where: {
      participants: {
        some: { id: existingUser.id }
      }
    },
    include: {
      participants: { select: { id: true, name: true, email: true } },
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      }
    }
  });

  const conversationsWithUnread = await Promise.all(conversations.map(async (conversation) => {
    const unreadCount = await prisma.message.count({
      where: {
        conversationId: conversation.id,
        receiverId: existingUser.id,
        isRead: false
      }
    });
    return {
      ...conversation,
      unreadCount,
      lastMessage: conversation.messages[0]
    };
  }));

  // Sort by last message date
  conversationsWithUnread.sort((a, b) => {
    const dateA = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
    const dateB = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
    return dateB - dateA;
  });

  return NextResponse.json(conversationsWithUnread);
}

export async function POST(req: NextRequest) {
  const user = await currentUser();
  const email = user?.emailAddresses[0]?.emailAddress;
  if (!email) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const me = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (!me) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const participantIds: unknown = body?.participantIds;
  if (
    !Array.isArray(participantIds) ||
    participantIds.length !== 2 ||
    !participantIds.every((id) => typeof id === "string" && id.length > 0)
  ) {
    return NextResponse.json({ error: 'Two participants are required' }, { status: 400 });
  }

  // The caller can only start a conversation that includes themselves.
  if (!participantIds.includes(me.id)) {
    return NextResponse.json({ error: 'You can only start conversations you are part of' }, { status: 403 });
  }

  const otherId = participantIds.find((id) => id !== me.id);
  if (!otherId) {
    return NextResponse.json({ error: 'You cannot start a conversation with yourself' }, { status: 400 });
  }

  const other = await prisma.user.findUnique({ where: { id: otherId }, select: { id: true } });
  if (!other) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const existing = await prisma.conversation.findFirst({
    where: {
      AND: [
        { participants: { some: { id: me.id } } },
        { participants: { some: { id: other.id } } },
      ],
    },
    include: { participants: { select: { id: true, name: true, email: true } } },
  });

  if (existing) {
    return NextResponse.json(existing);
  }

  const conversation = await prisma.conversation.create({
    data: {
      participants: {
        connect: [{ id: me.id }, { id: other.id }],
      },
    },
    include: { participants: { select: { id: true, name: true, email: true } } },
  });

  return NextResponse.json(conversation);
}
