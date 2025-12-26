import { prisma } from "@/lib/db";
import { currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(){
    try {
        const user = await currentUser()
        if(!user){
            return NextResponse.json({message:"Unauthourized user"}, {status:405})
        }

        const email = user.emailAddresses?.[0].emailAddress
        console.log(email)
        const existingUser = await prisma.user.findUnique({
            where:{
                email:email
            },
            include:{
                products:true
            }
        })

        if(!existingUser){
            return NextResponse.json({message:"Unauthourized user"}, {status:405})
        }

        return NextResponse.json({result:existingUser.products}, {status:200})
    } catch (error) {
        return NextResponse.json({message:"Internal server error"}, {status:500})
    }
}