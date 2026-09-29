import { prisma } from "@/lib/db";
import { eventNotPastSql, reservedTicketCountSql } from "@/lib/product-inventory";
import { Prisma } from "@prisma/client";
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

        const [productRow] = await prisma.$queryRaw<Array<{
            id: string;
            listingId: string;
            name: string;
            imageUrl: string | null;
            image: string | null;
            price: number;
            refundPeriod: string;
            estimatedTime: string;
            description: string;
            sellerId: string;
            categoryId: string;
            isSold: boolean;
            createdAt: Date;
            updatedAt: Date;
            ticketQuantity: number;
            reserved: number;
            ticketPartner: string;
            category_name: string;
            seller_name: string | null;
            seller_email: string | null;
        }>>(Prisma.sql`
            SELECT
                p.*,
                ${reservedTicketCountSql(Prisma.raw(`p."id"`))} AS "reserved",
                c."name" AS category_name,
                u."name" AS seller_name,
                u."email" AS seller_email
            FROM "Products" p
            JOIN "Category" c ON c."id" = p."categoryId"
            JOIN "User" u ON u."id" = p."sellerId"
            WHERE (
                p."id" = ${normalizedProductId}
                OR p."listingId" = ${normalizedProductId.toUpperCase()}
              )
              AND p."isSold" = false
              AND ${reservedTicketCountSql(Prisma.raw(`p."id"`))} < p."ticketQuantity"
        AND ${eventNotPastSql("p")}
            LIMIT 1
        `);

        const product = productRow ? {
            id: productRow.id,
            listingId: productRow.listingId,
            name: productRow.name,
            imageUrl: productRow.imageUrl,
            image: productRow.image,
            price: productRow.price,
            refundPeriod: productRow.refundPeriod,
            estimatedTime: productRow.estimatedTime,
            description: productRow.description,
            sellerId: productRow.sellerId,
            categoryId: productRow.categoryId,
            isSold: productRow.isSold,
            createdAt: productRow.createdAt,
            updatedAt: productRow.updatedAt,
            ticketQuantity: productRow.ticketQuantity,
            availableQuantity: Math.max(productRow.ticketQuantity - productRow.reserved, 0),
            ticketPartner: productRow.ticketPartner,
            category: {
                id: productRow.categoryId,
                name: productRow.category_name,
            },
            seller: {
                id: productRow.sellerId,
                name: productRow.seller_name,
                email: productRow.seller_email,
            },
        } : null;

        if (!product) {
            return NextResponse.json({ message: "Listing not found or unavailable", result: null }, { status: 404 });
        }

        return NextResponse.json({result:product}, {status:200})
    } catch {
        return NextResponse.json({message:"Internal server error"}, {status:500})
    }
}
