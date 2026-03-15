import { prisma } from "@/lib/db";
import { getCurrentDbUser } from "@/lib/current-db-user";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const user = await getCurrentDbUser()
        if (!user) {
            return NextResponse.json({ message: "Unauthourized user" }, { status: 405 })
        }

        return NextResponse.json({ id: user.id })
    } catch (error) {
        return NextResponse.json({ messsage: "Internal server error" }, { status: 500 })
    }
}
