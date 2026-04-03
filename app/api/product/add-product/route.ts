import { prisma } from "@/lib/db";
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
        while (await prisma.products.findUnique({ where: { listingId } })) {
            listingId = createListingId();
        }

        const product = await prisma.products.create({
            data: {
                listingId,
                name,
                imageUrl,
                price,
                refundPeriod,
                description,
                sellerId: existingUser.id,
                categoryId: cat.id,
                image,
                estimatedTime,
                ticketQuantity: Number(ticketQuantity),
                ticketPartner,
            }
        });

        return NextResponse.json({ result: product }, { status: 200 });

    } catch (error) {
        console.error("Error creating product:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
