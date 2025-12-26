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
        let existingUser = await prisma.user.findUnique({
            where: { email: userEmail }
        });

        if(!existingUser){
            return NextResponse.json({message:"Unauthourized user"}, {status:401})
        }

        const orders = await prisma.user.findUnique({
            where:{
                email:userEmail
            },
            include:{
                orders:{
                    include:{
                        orderItems:{
                            include:{
                                product:true
                            }
                        }
                    }
                }
            },
        })

        return NextResponse.json({result:{orders:orders?.orders, existingUser}}, {status:200})
    } catch (error) {
        return NextResponse.json({ message: "Internal server error" }, { status: 500 })
    }
}