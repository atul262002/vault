import { prisma } from "@/lib/db";
import { isAllowedEvidenceUrl } from "@/lib/evidence-url";
import { todayInIndia } from "@/lib/product-inventory";
import { Prisma } from "@prisma/client";
import { currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

const MAX_TICKET_PRICE = 1_000_000;

function isValidIsoDate(value: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

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

        // Without a payout account the seller can't be paid when a buyer
        // confirms, which would leave that buyer's order stuck.
        if (!existingUser.fundAccountId) {
            return NextResponse.json(
                { message: "Set up your payout account (Get Verified) before listing tickets." },
                { status: 403 }
            );
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
            return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
        }

        const parsedTicketQuantity = Number(ticketQuantity);
        if (!Number.isInteger(parsedTicketQuantity) || parsedTicketQuantity < 1) {
            return NextResponse.json(
                { message: "Number of tickets must be a whole number of at least 1" },
                { status: 400 }
            );
        }

        const parsedPrice = Number(price);
        if (!Number.isFinite(parsedPrice) || parsedPrice < 1 || parsedPrice > MAX_TICKET_PRICE) {
            return NextResponse.json(
                { message: `Price must be between ₹1 and ₹${MAX_TICKET_PRICE.toLocaleString("en-IN")}` },
                { status: 400 }
            );
        }

        if (typeof estimatedTime !== "string" || !isValidIsoDate(estimatedTime)) {
            return NextResponse.json({ message: "Event date must be a valid date" }, { status: 400 });
        }
        if (estimatedTime < todayInIndia()) {
            return NextResponse.json({ message: "Event date can't be in the past" }, { status: 400 });
        }

        // Images are rendered with next/image on every buyer's dashboard; an
        // arbitrary host would break rendering (or point buyers elsewhere).
        for (const url of [imageUrl, image]) {
            if (url != null && url !== "" && !isAllowedEvidenceUrl(url)) {
                return NextResponse.json({ message: "Please upload the ticket image through Vault" }, { status: 400 });
            }
        }

        const textFields: Array<[string, unknown, number]> = [
            ["Event name", name, 200],
            ["Event time", refundPeriod, 100],
            ["Description", description, 5000],
            ["Location", category, 100],
            ["Ticket partner", ticketPartner, 100],
        ];
        for (const [label, value, maxLength] of textFields) {
            if (typeof value !== "string" || !value.trim() || value.length > maxLength) {
                return NextResponse.json(
                    { message: `${label} is required and must be at most ${maxLength} characters` },
                    { status: 400 }
                );
            }
        }

        let cat = await prisma.category.findUnique({
            where: { name: category }
        });

        if (!cat) {
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
                ${parsedPrice},
                ${refundPeriod},
                ${estimatedTime},
                ${description},
                ${existingUser.id},
                ${cat.id},
                ${image ?? null},
                false,
                ${parsedTicketQuantity},
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
