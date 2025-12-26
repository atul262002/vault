import { prisma } from "@/lib/db";
import { currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user?.emailAddresses[0]?.emailAddress) {
      return NextResponse.json({ message: "Unauthorized user" }, { status: 401 });
    }

    const email = user.emailAddresses[0].emailAddress;
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (!existingUser) {
      return NextResponse.json({ message: "Unauthorized user" }, { status: 401 });
    }

    // Read productId & receiverId from body
    const body = await req.json();
    const { productId, receiverId } = body;

    if (!productId || !receiverId) {
      return NextResponse.json({ error: "Missing productId or receiverId" }, { status: 400 });
    }

    // Case 1: User is trying to load chat with themselves -> get the real chat partner
    if (existingUser.id === receiverId) {
      const firstMessage = await prisma.message.findFirst({
        where: { productId },
        orderBy: { createdAt: "asc" },
      });

      if (!firstMessage) {
        return NextResponse.json({ error: "Chat not found" }, { status: 404 });
      }

      const realOtherUserId = firstMessage.senderId;

      const messages = await prisma.message.findMany({
        where: {
          productId,
          OR: [
            { senderId: existingUser.id, receiverId: realOtherUserId },
            { senderId: realOtherUserId, receiverId: existingUser.id },
          ],
        },
        orderBy: { createdAt: "asc" },
      });

      return NextResponse.json(messages);
    }

    // Case 2: Normal chat between two different users
    const messages = await prisma.message.findMany({
      where: {
        productId,
        OR: [
          { senderId: existingUser.id, receiverId },
          { senderId: receiverId, receiverId: existingUser.id },
        ],
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(messages);
  } catch (error) {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
