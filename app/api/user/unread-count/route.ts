import { prisma } from "@/lib/db";
import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function GET() {
    const user = await currentUser();
    if (!user?.emailAddresses[0]?.emailAddress) {
        return NextResponse.json({ count: 0 }); // Fail safe to 0
    }

    const email = user.emailAddresses[0].emailAddress;
    const existingUser = await prisma.user.findUnique({
        where: { email },
    });

    if (!existingUser) {
        return NextResponse.json({ count: 0 });
    }

    const count = await prisma.message.count({
        where: {
            receiverId: existingUser.id,
            isRead: false
        }
    });

    return NextResponse.json({ count });
}
