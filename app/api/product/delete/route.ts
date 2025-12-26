import { prisma } from "@/lib/db";
import { currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json(
        { message: "Unauthenticated user" },
        { status: 401 }
      );
    }

    const email = user.emailAddresses?.[0].emailAddress
    const existingUser = await prisma.user.findUnique({
        where: {
            email: email
        },
        select:{
            id:true
        }
    })


    const { productId } = await request.json();
    if (!productId || productId === "") {
      return NextResponse.json(
        { message: "Invalid productId" },
        { status: 400 }
      );
    }

    // Check if product exists
    const product = await prisma.products.findUnique({
      where: {
        id: productId,
      },
    });

    if (!product) {
      return NextResponse.json(
        { message: "Product not found" },
        { status: 404 }
      );
    }

    // Check if the user is the seller of this product
    if (product.sellerId !== existingUser.id) {
      return NextResponse.json(
        { message: "You are not authorized to delete this product" },
        { status: 403 }
      );
    }

    // Check if product has any orders
    const orderItems = await prisma.orderItem.findFirst({
      where: { productId: productId },
    });

    if (orderItems) {
      return NextResponse.json(
        { message: "Cannot delete product with existing orders" },
        { status: 400 }
      );
    }

    // Delete the product
    await prisma.products.delete({
      where: { id: productId },
    });

    return NextResponse.json(
      { message: "Product deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting product:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}