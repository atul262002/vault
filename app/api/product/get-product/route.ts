import { prisma } from "@/lib/db";
import { currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request:NextRequest){
    try {
        const user = await currentUser()
        if(!user){
            return NextResponse.json({message:"Unauthenticated user"}, {status:404})
        }

        const { productId } = await request.json()
        if(!productId || productId === ""){
            return NextResponse.json({message:"Invalid productId"})
        }
        
        const normalizedProductId = String(productId).trim();

        const product = await prisma.products.findFirst({
            where:{
                OR: [
                    { id: normalizedProductId },
                    { listingId: normalizedProductId.toUpperCase() }
                ]
            },
            include: {
                category: true,
                seller: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    }
                }
            }
        })

        return NextResponse.json({result:product}, {status:200})
    } catch {
        return NextResponse.json({message:"Internal server error"}, {status:500})
    }
}
