import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

function createListingId() {
    return `VLT-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}

export async function POST(request: NextRequest) {
    try {
        const user = await currentUser();
        if (!user?.emailAddresses[0]?.emailAddress) {
            return NextResponse.json({ message: "Unauthorized user" }, { status: 401 });
        }

        const userEmail = user.emailAddresses[0].emailAddress;
        const existingUser = await prisma.user.findUnique({
            where: { email: userEmail }
        });

        if (!existingUser || !existingUser.id) {
            return NextResponse.json({ message: "Unauthorized user" }, { status: 401 })
        }

        const {
            name,
            imageUrl,
            price,
            refundPeriod,
            description,
            category,
            estimatedTime,
            image,
            ticketQuantity,
            ticketPartner
        } = await request.json();

        if (!name || !price || !refundPeriod || !description || !category || !estimatedTime || !ticketQuantity || !ticketPartner) {
            console.log("Missing required fields");
            return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
        }

        let cat = await prisma.category.findUnique({
            where: { name: category }
        });

        if (!cat) {
            console.log(`Category not found for name: ${category}, creating it...`);
            cat = await prisma.category.create({
                data: { name: category }
            });
        }

        let listingId = createListingId();
        while (true) {
            const existingListing = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
                SELECT "id"
                FROM "Products"
                WHERE "listingId" = ${listingId}
                LIMIT 1
            `);

            if (existingListing.length === 0) {
                break;
            }

            listingId = createListingId();
        }

        const [product] = await prisma.$queryRaw<Array<{
            id: string;
            listingId: string;
            name: string;
            imageUrl: string | null;
            price: number;
            refundPeriod: string;
            estimatedTime: string;
            description: string;
            sellerId: string;
            categoryId: string;
            createdAt: Date;
            updatedAt: Date;
            image: string | null;
            isSold: boolean;
            ticketQuantity: number;
            ticketPartner: string;
        }>>(Prisma.sql`
            INSERT INTO "Products" (
                "id",
                "listingId",
                "name",
                "imageUrl",
                "price",
                "refundPeriod",
                "estimatedTime",
                "description",
                "sellerId",
                "categoryId",
                "image",
                "isSold",
                "ticketQuantity",
                "ticketPartner",
                "createdAt",
                "updatedAt"
            )
            VALUES (
                ${crypto.randomUUID()},
                ${listingId},
                ${name},
                ${imageUrl ?? null},
                ${Number(price)},
                ${refundPeriod},
                ${estimatedTime},
                ${description},
                ${existingUser.id},
                ${cat.id},
                ${image ?? null},
                false,
                ${Number(ticketQuantity)},
                ${ticketPartner},
                NOW(),
                NOW()
            )
            RETURNING *
        `);

        return NextResponse.json({ result: product }, { status: 200 });

    } catch (error) {
        console.error("Error creating product:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
