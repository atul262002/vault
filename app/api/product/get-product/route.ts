import { prisma } from "@/lib/db";
import { ACTIVE_LISTING_ORDER_STATUSES, PAYMENT_PENDING_LOCK_MINUTES } from "@/lib/order-availability";
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
            ticketPartner: string;
            category_name: string;
            seller_name: string | null;
            seller_email: string | null;
        }>>(Prisma.sql`
            SELECT
                p.*,
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
              AND NOT EXISTS (
                SELECT 1
                FROM "OrderItem" oi
                JOIN "Order" o ON o."id" = oi."orderId"
                WHERE oi."productId" = p."id"
                  AND o."status" IN (${Prisma.join(
                    ACTIVE_LISTING_ORDER_STATUSES.map((status) => Prisma.sql`${status}::"OrderStatus"`)
                  )})
                  AND (
                    o."status" <> ${"PAYMENT_PENDING"}::"OrderStatus"
                    OR o."createdAt" >= NOW() - (${PAYMENT_PENDING_LOCK_MINUTES} * INTERVAL '1 minute')
                  )
              )
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
