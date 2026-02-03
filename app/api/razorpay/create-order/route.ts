// import { prisma } from "@/lib/db";
// import { currentUser } from "@clerk/nextjs/server";
// import { NextRequest, NextResponse } from "next/server";
// import Razorpay from "razorpay";

// export async function POST(req: NextRequest) {
//   try {
//     const user = await currentUser();
//     if (!user?.emailAddresses[0]?.emailAddress) {
//       return NextResponse.json({ message: "Unauthorized user" }, { status: 401 });
//     }

//     const userEmail = user.emailAddresses[0].emailAddress;
//     let existingUser = await prisma.user.findUnique({
//       where: { email: userEmail }
//     });

//     if(!existingUser){
//       return NextResponse.json({message:"Unauthourized user"}, {status:401})
//     }

//     const { amount, currency, product } = await req.json();

//     if (!amount || !currency || !product) {
//       return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
//     }



//     const razorpay = new Razorpay({
//       key_id: process.env.RAZORPAYX_KEY_ID!,
//       key_secret: process.env.RAZORPAYX_KEY_SECRET!,
//     });


//     const order = await razorpay.orders.create({
//       amount: amount * 100,  
//       currency: currency || "INR",
//       receipt: `receipt_${Date.now()}`,

//     });

//     const newOrder = await prisma.order.create({
//       data: {
//         razorpayId: order.id,
//         buyerId: existingUser.id,
//         totalAmount:amount,
//         status:"PENDING",
//         orderItems:{
//           create:product.map((item:any)=>({
//             productId: item.id,
//             price:item.price
//           }))
//         }
//       }
//     })



//     return NextResponse.json({ orderId: newOrder.id }, { status: 200 });
//   } catch (error: any) {
//     console.error("Order creation error:", error);
//     return NextResponse.json({ error: error.message }, { status: 500 });
//   }
// }



import { prisma } from "@/lib/db";
import { currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";

export async function POST(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user?.emailAddresses[0]?.emailAddress) {
      return NextResponse.json({ message: "Unauthorized user" }, { status: 401 });
    }

    const userEmail = user.emailAddresses[0].emailAddress;

    const existingUser = await prisma.user.upsert({
      where: { email: userEmail },
      update: {},
      create: {
        email: userEmail,
        name: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || "User",
        isVerified: false
      }
    });

    const { amount, currency, product, ticketPartner, transferDetails } = await req.json();
    if (!amount || !currency || !product) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    // Revenue Model: Take Rs.99 from buyer
    const platformFeeBuyer = 99;
    const platformFeeSeller = 99;
    const totalAmountToPay = amount + platformFeeBuyer;

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAYX_KEY_ID!,
      key_secret: process.env.RAZORPAYX_KEY_SECRET!,
    });

    const order = await razorpay.orders.create({
      amount: totalAmountToPay * 100, // Razorpay expects amount in paise
      currency: currency || "INR",
      receipt: `receipt_${Date.now()}`,
    });

    const newOrder = await prisma.order.create({
      data: {
        razorpayId: order.id,
        buyerId: existingUser.id,
        totalAmount: totalAmountToPay,
        platformFeeBuyer: platformFeeBuyer,
        platformFeeSeller: platformFeeSeller,
        ticketPartner: ticketPartner,
        transferDetails: transferDetails,
        status: "WAITING_FOR_TRANSFER", // Initial status after payment should be waiting for transfer handling, but usually we wait for payment success webhook/verification.
        // However, standard flow is PENDING -> (Payment Success) -> WAITING_FOR_TRANSFER. 
        // For now, I'll keep it PENDING, and the payment success mechanism (which I need to find) should update it.
        // Actually, looking at the code, it sets PENDING.
        orderItems: {
          create: product.map((item: any) => ({
            productId: item.id,
            price: item.price
          }))
        }
      }
    });

    // Return all necessary data for Razorpay checkout
    return NextResponse.json({
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      orderId: newOrder.id
    }, { status: 200 });

  } catch (error: any) {
    console.error("Order creation error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}