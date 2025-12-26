import { prisma } from "@/lib/db";
import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const user = await currentUser()
        if (!user) {
            return NextResponse.json({ message: "Unauthourized user" }, { status: 405 })
        }
        const email = user.emailAddresses?.[0].emailAddress
        const existingUser = await prisma.user.findUnique({
            where: {
                email: email
            }
        })

        if (!existingUser) {
            return NextResponse.json({ message: "Unauthourized user" }, { status: 405 })
        }

        const userStatus = await prisma.user.findUnique({
            where:{
                email:email
            }
        })

        return NextResponse.json({result:userStatus?.isVerified}, {status:200})
    } catch (error) {
        console.log(error)
        return NextResponse.json({ messsage: "Internal server error" }, { status: 500 })
    }
}