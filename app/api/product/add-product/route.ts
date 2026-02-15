import { prisma } from "@/lib/db";
import { currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    try {
        const user = await currentUser();
        if (!user?.emailAddresses[0]?.emailAddress) {
            return NextResponse.json({ message: "Unauthorized user" }, { status: 401 });
        }

        const userEmail = user.emailAddresses[0].emailAddress;
        let existingUser = await prisma.user.findUnique({
            where: { email: userEmail }
        });

        if (!existingUser || !existingUser.id) {
            return NextResponse.json({ message: "Unauthorized user" }, { status: 401 })
        }


        const { name, imageUrl, price, refundPeriod, description, category, estimatedTime, image } = await request.json();

        console.log("Create Product Request Body:", { name, imageUrl, price, refundPeriod, description, category, estimatedTime, image });

        if (!name || !price || !refundPeriod || !description || !category) {
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

        const product = await prisma.products.create({
            data: {
                name,
                imageUrl,
                price,
                refundPeriod,
                description,
                sellerId: existingUser.id,
                categoryId: cat.id,
                image,
                estimatedTime: estimatedTime
                // sellerPhoneNo: user.phoneNumbers[0].phoneNumber
            }
        });

        return NextResponse.json({ result: product }, { status: 200 });

    } catch (error) {
        console.error("Error creating product:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
