"use client";
import React, { useEffect, useState } from "react";
import axios from "axios";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface Order {
  id: string;
  status: string;
  totalAmount: number;
  razorpayId?: string;
  payoutId?: string;
  orderItems: {
    id: string;
    productId: string;
    price: number;
    product: {
      name: string;
      imageUrl: string;
      description: string;
      refundPeriod: string;
      sellerId: string;
    };
  }[];
}

interface User {}

const MyOrders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const slug = pathname.split("/")[1];

  useEffect(() => {
    async function fetchOrders() {
      try {
        const response = await axios.get("/api/orders/get-orders");
        if (response.status === 200) {
          setOrders(response.data.result.orders || []);
          setUser(response.data.result.existingUser || null);
        }
      } catch (error) {
        console.error("Error fetching orders:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchOrders();
  }, []);

  const handleCapture = async (
    sellerId: string,
    amount: number,
    orderId: string
  ) => {
    try {
      const response = await axios.post("/api/razorpay/confirm-delivery", {
        sellerId,
        amount,
        orderId,
      });

      if (response.status === 200) {
        console.log("Payout initiated successfully:", response.data);
        setOrders((prevOrders) =>
          prevOrders.map((order) =>
            order.id === orderId
              ? { ...order, status: "COMPLETED", payoutId: response.data.payout.id }
              : order
          )
        );
      } else {
        console.error("Failed to initiate payout:", response.data);
      }
    } catch (error: any) {
      console.error("Error initiating payout:", error.response?.data || error.message);
    }
  };

  return (
    <div className="max-w-4xl mx-auto my-8">
      <h1 className="text-3xl font-bold text-center mb-6">My Orders</h1>

      {loading ? (
        <p className="text-center text-gray-600">Loading orders...</p>
      ) : orders.length === 0 ? (
        <p className="text-center text-gray-600">No orders found.</p>
      ) : (
        <div className="space-y-6">
          {(slug === "orders" ? orders : orders.slice(0, 3)).map((order) => (
            <Card key={order.id} className="p-4 w-full shadow-md border border-gray-200">
              {order.orderItems.map((item) => (
                <CardContent
                  key={item.id}
                  className="flex flex-col md:flex-row items-center gap-4"
                >
                  <div className="w-32 h-32 relative">
                    <Image
                      src={item.product.imageUrl ?? ""}
                      alt={item.product.name}
                      layout="fill"
                      objectFit="cover"
                      className="rounded-md"
                    />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold">{item.product.name}</h2>
                    <p className="text-gray-600">{item.product.description}</p>
                    <p className="text-gray-500">
                      <span className="font-semibold">Refund Period:</span>{" "}
                      {item.product.refundPeriod}
                    </p>
                    <p className="text-green-600 font-semibold">
                      ₹{item.price.toFixed(2)}
                    </p>
                  </div>
                </CardContent>
              ))}
              <CardFooter className="w-full flex justify-end pt-4 mt-4 border-t border-gray-100">
                {order.status !== "COMPLETED" ? (
                  <Button
                    variant="default"
                    onClick={() =>
                      handleCapture(
                        order.orderItems[0].product.sellerId,
                        order.totalAmount,
                        order.id
                      )
                    }
                  >
                    Confirm Delivery & Pay Seller
                  </Button>
                ) : (
                  <span className="text-gray-500">Payment Processed to Seller</span>
                )}
              </CardFooter>
            </Card>
          ))}
          {slug !== "orders" ? (
            <Button>
              <Link href={`/orders/history`}>View all orders</Link>
            </Button>
          ) : (
            <Button>
              <Link href={`/dashboard`}>Back</Link>
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default MyOrders;
