import { prisma } from '@/lib/db';
import { currentUser } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
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
      participants: true,
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
  // expects body with participantIds: [userA, userB]
  const { participantIds } = await req.json();
  if (!participantIds || participantIds.length !== 2) {
    return NextResponse.json({ error: 'Two participants are required' }, { status: 400 });
  }

  const existing = await prisma.conversation.findFirst({
    where: {
      AND: participantIds.map((id: any) => ({
        participants: { some: { id } }
      }))
    }
  });

  if (existing) {
    return NextResponse.json(existing);
  }

  const conversation = await prisma.conversation.create({
    data: {
      participants: {
        connect: participantIds.map((id: any) => ({ id }))
      }
    },
    include: {
      participants: true
    }
  });

  return NextResponse.json(conversation);
}
