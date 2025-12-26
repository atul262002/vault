import { prisma } from "@/lib/db";
import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const user = await currentUser();
        if (!user?.emailAddresses[0]?.emailAddress) {
            return NextResponse.json({ message: "Unauthorized user" }, { status: 401 });
        }

        const userEmail = user.emailAddresses[0].emailAddress;
        const userEarnings = await prisma.user.findMany({
            where: {
                email: userEmail
            },
            include: {
                orders: true
            }
        })

        const sold = userEarnings[0]?.orders.filter((o)=>o.status === "COMPLETED").length
        const pending = userEarnings[0]?.orders.filter((o)=>o.status === "PENDING").length
        const failed = userEarnings[0]?.orders.filter((o)=>o.status === "FAILED").length

        return NextResponse.json({
            sold,pending,failed
        })

    } catch (error: any) {
        console.error("Internal server error:", error);
        return NextResponse.json({ message: error.message || "Internal server error" }, { status: 500 });
    }
}
