"use client";
import React, { useEffect, useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { usePathname } from "next/navigation";
import OrderCard from "@/components/orderComponents/order-card"; // Import the new component

interface Order {
  id: string;
  status: string;
  totalAmount: number;
  razorpayId?: string;
  payoutId?: string;
  ticketPartner?: string;
  transferDetails?: string;
  transferStartedAt?: string;
  evidenceUploadedAt?: string;
  buyerId: string;
  createdAt: string;
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

interface User {
  id: string;
  email?: string;
}

const MyOrders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const slug = pathname.split("/")[1];

  async function fetchOrders() {
    try {
      const response = await axios.get("/api/orders/get-orders");
      if (response.status === 200) {
        const fetchedOrders: Order[] = response.data.result.orders || [];
        fetchedOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setOrders(fetchedOrders);
        setUser(response.data.result.existingUser || null);
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchOrders();
  }, []);

  const refreshOrders = () => {
    fetchOrders();
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
            <OrderCard
              key={order.id}
              order={order}
              currentUser={user}
              refreshOrders={refreshOrders}
            />
          ))}
          {slug !== "orders" ? (
            <Button className="w-full mt-4">
              <Link href={`/orders/history`}>View all orders</Link>
            </Button>
          ) : (
            <div className="flex justify-center mt-4">
              <Button>
                <Link href={`/dashboard`}>Back to Dashboard</Link>
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MyOrders;
