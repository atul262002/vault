import { prisma } from "@/lib/db";
import { currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request:NextRequest){
    try {
        const user =  await currentUser()
        if(!user){
            return NextResponse.json({message:"Unauthourized user"}, {status:405})
        }
        const email = user.emailAddresses?.[0].emailAddress
        const existingUser = await prisma.user.findUnique({
            where:{
                email: email
            }
        })

        if(!existingUser){
            await prisma.user.create({
                data:{
                    name:user.firstName,
                    email:email,
                    phone:user.phoneNumbers?.[0].phoneNumber,
                    role:["SELLER"],
                    isVerified:true       
                }
            })
        }

        const {adhar} = await request.json()
        if(!adhar || adhar === ""){
            return NextResponse.json({message:"Adhar is required"}, {status:405})
        }

        // await prisma.user.update({
        //     where:{
        //         email:existingUser?.email
        //     },
        //     data:{
        //         isVerified:true
        //     }
        // })

        return NextResponse.json({status:200})
    } catch (error) {
        return NextResponse.json({message:"Internal server error"}, {status:500})
    }
}