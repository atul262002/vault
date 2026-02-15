"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import { format } from "date-fns";
import { Loader2, AlertTriangle, CheckCircle, Upload, Clock, TimerOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

// Define User Interface matching Prisma User
interface User {
    id: string;
    name: string | null;
    email: string | null;
}

// Define Product Interface
interface Product {
    id: string;
    name: string;
    sellerId: string;
    seller: User;
}

// Define Order Item Interface
interface OrderItem {
    id: string;
    price: number;
    product: Product;
}

// Define Order Interface
interface Order {
    id: string;
    status: string;
    totalAmount: number;
    platformFeeBuyer: number;
    platformFeeSeller: number;
    ticketPartner: string | null;
    transferDetails: string | null;
    transferStartedAt: string | null;
    evidenceUploadedAt: string | null;
    evidenceUrl: string | null;
    buyerConfirmedAt: string | null;
    buyerId: string;
    buyer: User;
    orderItems: OrderItem[];
    createdAt: string;
}

export default function OrderDetailsPage() {
    const { user, isLoaded } = useUser();
    const params = useParams();
    const router = useRouter();
    const [order, setOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [evidenceLink, setEvidenceLink] = useState(""); // For simplicity, using text input for URL. Ideally file upload.
    const [timeLeft, setTimeLeft] = useState<string | null>(null);

    // Fetch Order Details (Need to implement a GET route for this or use server component)
    // For now assuming we can fetch via a GET route. I'll need to create this GET route if it doesn't exist.
    // Actually, standard is to use server components in App Router, but for dynamic updates client is easier.
    // I will check if get-orders supports fetching by ID or I'll add a new GET route.

    useEffect(() => {
        // Placeholder fetching logic - I need to ensure the GET route exists. 
        // I'll create `app/api/orders/[orderId]/route.ts` next.
        const fetchOrder = async () => {
            try {
                const response = await axios.get(`/api/orders/${params.orderId}`);
                setOrder(response.data);
            } catch (error) {
                console.error("Error fetching order:", error);
                toast.error("Failed to load order details");
            } finally {
                setLoading(false);
            }
        };
        if (params.orderId) fetchOrder();
    }, [params.orderId]);

    // Timer Logic
    useEffect(() => {
        if (!order) return;

        const calculateTimeLeft = () => {
            const now = new Date().getTime();
            let targetTime: number | null = null;

            if (order.status === "TRANSFER_INITIATED" || order.status === "WAITING_FOR_TRANSFER") {
                if (order.transferStartedAt) {
                    targetTime = new Date(order.transferStartedAt).getTime() + 60 * 60000; // 60 mins from payment
                }
            } else if (order.status === "EVIDENCE_UPLOADED" && order.evidenceUploadedAt) {
                targetTime = new Date(order.evidenceUploadedAt).getTime() + 30 * 60000; // 30 mins from evidence
            }

            if (targetTime) {
                const difference = targetTime - now;
                if (difference > 0) {
                    const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
                    const seconds = Math.floor((difference % (1000 * 60)) / 1000);
                    setTimeLeft(`${minutes}m ${seconds}s`);
                } else {
                    setTimeLeft("Expired");
                }
            } else {
                setTimeLeft(null);
            }
        };

        const timer = setInterval(calculateTimeLeft, 1000);
        calculateTimeLeft();
        return () => clearInterval(timer);
    }, [order]);


    const handleInitiateTransfer = async () => {
        setActionLoading(true);
        try {
            const res = await axios.post(`/api/orders/${order?.id}/initiate-transfer`);
            setOrder(res.data);
            toast.success("Transfer initiated!");
        } catch (error) {
            toast.error("Failed to initiate transfer");
        } finally {
            setActionLoading(false);
        }
    };

    const handleUploadEvidence = async () => {
        if (!evidenceLink) {
            toast.error("Please provide an evidence URL");
            return;
        }
        setActionLoading(true);
        try {
            const res = await axios.post(`/api/orders/${order?.id}/upload-evidence`, { evidenceUrl: evidenceLink });
            setOrder(res.data);
            toast.success("Evidence uploaded!");
        } catch (error) {
            toast.error("Failed to upload evidence");
        } finally {
            setActionLoading(false);
        }
    };

    const handleConfirm = async () => {
        setActionLoading(true);
        try {
            const res = await axios.post(`/api/orders/${order?.id}/confirm`);
            setOrder(res.data);
            toast.success("Order confirmed and completed!");
        } catch (error) {
            toast.error("Failed to confirm order");
        } finally {
            setActionLoading(false);
        }
    };

    const handleDispute = async () => {
        setActionLoading(true);
        try {
            const res = await axios.post(`/api/orders/${order?.id}/dispute`);
            setOrder(res.data);
            toast.error("Order disputed. Support will contact you.");
        } catch (error) {
            toast.error("Failed to raise dispute");
        } finally {
            setActionLoading(false);
        }
    };

    const handleResolveTimeout = async () => {
        setActionLoading(true);
        try {
            const res = await axios.post(`/api/orders/${order?.id}/resolve-timeout`);
            setOrder(res.data);
            toast.success("Timeout resolved successfully");
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to resolve timeout");
        } finally {
            setActionLoading(false);
        }
    };

    if (loading || !isLoaded) return <div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin" /></div>;
    if (!order || !user) return <div className="text-center p-10">Order not found or unauthorized</div>;

    const isBuyer = user.id === order.buyerId;
    const isSeller = user.id === order.orderItems[0]?.product.sellerId;

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle className="text-2xl font-bold">Order #{order.id.slice(0, 8)}</CardTitle>
                            <CardDescription>Created on {format(new Date(order.createdAt), "PPP")}</CardDescription>
                        </div>
                        <div className={`px-4 py-2 rounded-full font-semibold text-sm ${order.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                            order.status === 'DISPUTED' ? 'bg-red-100 text-red-800' :
                                'bg-yellow-100 text-yellow-800'
                            }`}>
                            {order.status === "CANCELLED" ? "CANCELLED" : order.status.replace(/_/g, " ")}
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">

                    {/* Steps Visualizer could go here */}

                    {/* PRODUCT DETAILS */}
                    <div className="border p-4 rounded-lg bg-gray-50">
                        <h3 className="font-semibold mb-2">Product Details</h3>
                        {order.orderItems.map((item) => (
                            <div key={item.id} className="flex justify-between items-center">
                                <span>{item.product.name}</span>
                                <span className="font-bold">₹{item.price}</span>
                            </div>
                        ))}
                        <div className="flex justify-between items-center mt-2 text-sm text-gray-500">
                            <span>Platform Fee ({isBuyer ? 'Buyer' : 'Seller'})</span>
                            <span>₹{isBuyer ? order.platformFeeBuyer : order.platformFeeSeller}</span>
                        </div>
                        <div className="flex justify-between items-center mt-2 pt-2 border-t font-bold">
                            <span>Total {isBuyer ? 'Paid' : 'Payout'}</span>
                            <span>₹{isBuyer ? order.totalAmount : (order.orderItems[0].price - order.platformFeeSeller)}</span>
                        </div>
                        {/* Note about fees */}
                        <div className="mt-2 text-xs text-blue-600 bg-blue-50 p-2 rounded">
                            <strong>Note:</strong> Platform fees are 5% for the buyer and 2.5% for the seller.
                        </div>
                    </div>

                    {/* TRANSFER DETAILS */}
                    {(order.ticketPartner || order.transferDetails) && (
                        <div className="border p-4 rounded-lg bg-blue-50">
                            <h3 className="font-semibold mb-2 text-blue-800">Transfer Instructions</h3>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                {order.ticketPartner && (
                                    <div>
                                        <span className="text-gray-500 block">Ticket Partner</span>
                                        <span className="font-medium">{order.ticketPartner}</span>
                                    </div>
                                )}
                                {order.transferDetails && (
                                    <div>
                                        <span className="text-gray-500 block">Transfer To</span>
                                        <span className="font-medium">{order.transferDetails}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}


                    {/* ACTION AREA */}
                    <div className="mt-6">

                        {/* SELLER ACTIONS */}
                        {isSeller && (
                            <>
                                {order.status === "WAITING_FOR_TRANSFER" && (
                                    <div className="space-y-4">
                                        <Alert className="bg-blue-50 border-blue-200">
                                            <AlertTriangle className="h-4 w-4 text-blue-600" />
                                            <AlertTitle>Action Required: Initiate Transfer</AlertTitle>
                                            <AlertDescription>
                                                Please transfer the tickets to the buyer using the details above. You must record a video of the transfer process as evidence.
                                            </AlertDescription>
                                        </Alert>
                                        <Button onClick={handleInitiateTransfer} disabled={actionLoading} className="w-full">
                                            {actionLoading ? <Loader2 className="animate-spin mr-2" /> : null}
                                            Initiate Transfer Process
                                        </Button>
                                    </div>
                                )}

                                {order.status === "TRANSFER_INITIATED" && (
                                    <div className="space-y-4">
                                        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg text-center">
                                            <div className="flex justify-center items-center gap-2 text-yellow-800 mb-2">
                                                <Clock className="w-5 h-5" />
                                                <span className="font-bold">Time Remaining: {timeLeft}</span>
                                            </div>
                                            <p className="text-sm text-yellow-700">Please complete the transfer and upload evidence before the timer expires (60 mins) to avoid cancellation.</p>
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Evidence URL (Video/Screenshot)</Label>
                                            <Input
                                                placeholder="Paste link to evidence (e.g., Google Drive, Dropbox)"
                                                value={evidenceLink}
                                                onChange={(e) => setEvidenceLink(e.target.value)}
                                            />
                                            <p className="text-xs text-gray-500">Please ensure the link is publicly accessible.</p>
                                        </div>

                                        <Button onClick={handleUploadEvidence} disabled={actionLoading} className="w-full">
                                            {actionLoading ? <Loader2 className="animate-spin mr-2" /> : <Upload className="mr-2 h-4 w-4" />}
                                            Submit Evidence
                                        </Button>
                                    </div>
                                )}

                                {order.status === "EVIDENCE_UPLOADED" && (
                                    <Alert className="bg-blue-50 border-blue-200">
                                        <Clock className="h-4 w-4 text-blue-600" />
                                        <AlertTitle>Waiting for Buyer Confirmation</AlertTitle>
                                        <AlertDescription>
                                            You have uploaded evidence. The buyer has 30 minutes to confirm receipt. Funds will be released upon confirmation.
                                            {timeLeft && timeLeft !== "Expired" && <div className="mt-2 font-mono font-bold">Auto-approval in: {timeLeft}</div>}
                                            {timeLeft === "Expired" && (
                                                <div className="mt-4">
                                                    <p className="text-red-600 font-bold mb-2">Time Expired!</p>
                                                    <Button onClick={handleResolveTimeout} disabled={actionLoading} className="bg-green-600 hover:bg-green-700 w-full">
                                                        {actionLoading ? <Loader2 className="animate-spin mr-2" /> : <TimerOff className="mr-2 h-4 w-4" />}
                                                        Claim Earnings (Buyer Timeout)
                                                    </Button>
                                                </div>
                                            )}
                                        </AlertDescription>
                                    </Alert>
                                )}
                            </>
                        )}

                        {/* BUYER ACTIONS */}
                        {isBuyer && (
                            <>
                                {order.status === "WAITING_FOR_TRANSFER" && (
                                    <Alert>
                                        <Clock className="h-4 w-4" />
                                        <AlertTitle>Waiting for Seller</AlertTitle>
                                        <AlertDescription>
                                            The seller has been notified to initiate the ticket transfer.
                                        </AlertDescription>
                                    </Alert>
                                )}

                                {order.status === "TRANSFER_INITIATED" && (
                                    <Alert className="bg-yellow-50 border-yellow-200">
                                        <Clock className="h-4 w-4 text-yellow-600" />
                                        <AlertTitle>Transfer in Progress</AlertTitle>
                                        <AlertDescription>
                                            The seller has started the transfer process. They have 60 minutes to complete it and upload evidence.
                                            {timeLeft && timeLeft !== "Expired" && <div className="mt-2 font-mono font-bold">Time remaining: {timeLeft}</div>}
                                            {timeLeft === "Expired" && (
                                                <div className="mt-4">
                                                    <p className="text-red-600 font-bold mb-2">Transfer Time Expired!</p>
                                                    <Button onClick={handleResolveTimeout} disabled={actionLoading} variant="destructive" className="w-full">
                                                        {actionLoading ? <Loader2 className="animate-spin mr-2" /> : <TimerOff className="mr-2 h-4 w-4" />}
                                                        Claim Refund (Seller Timeout)
                                                    </Button>
                                                </div>
                                            )}
                                        </AlertDescription>
                                    </Alert>
                                )}

                                {order.status === "EVIDENCE_UPLOADED" && (
                                    <div className="space-y-4">
                                        <Alert className="bg-green-50 border-green-200">
                                            <CheckCircle className="h-4 w-4 text-green-600" />
                                            <AlertTitle>Evidence Uploaded</AlertTitle>
                                            <AlertDescription>
                                                The seller has uploaded proof of transfer. Please review it and confirm receipt of tickets.
                                            </AlertDescription>
                                        </Alert>

                                        {order.evidenceUrl && (
                                            <div className="p-4 border rounded bg-gray-50 text-center">
                                                <a href={order.evidenceUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline font-medium">
                                                    View Evidence
                                                </a>
                                            </div>
                                        )}

                                        <div className="grid grid-cols-2 gap-4">
                                            <Button variant="outline" onClick={handleDispute} disabled={actionLoading} className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700">
                                                {actionLoading ? <Loader2 className="animate-spin mr-2" /> : <AlertTriangle className="mr-2 h-4 w-4" />}
                                                No, I didn't receive it
                                            </Button>
                                            <Button onClick={handleConfirm} disabled={actionLoading} className="bg-green-600 hover:bg-green-700">
                                                {actionLoading ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                                                Yes, Tickets Received
                                            </Button>
                                        </div>
                                        <div className="text-center text-xs text-gray-500">
                                            <Clock className="inline w-3 h-3 mr-1" />
                                            Auto-confirmation in: {timeLeft}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        {/* COMMON COMPLETED/DISPUTED STATES */}
                        {order.status === "COMPLETED" && (
                            <Alert className="bg-green-50 border-green-200">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                <AlertTitle>Order Completed</AlertTitle>
                                <AlertDescription>
                                    The transaction has been successfully completed. Funds have been released to the seller.
                                </AlertDescription>
                            </Alert>
                        )}

                        {order.status === "DISPUTED" && (
                            <Alert className="bg-red-50 border-red-200">
                                <AlertTriangle className="h-4 w-4 text-red-600" />
                                <AlertTitle>Order Disputed</AlertTitle>
                                <AlertDescription>
                                    A dispute has been raised for this order. Our support team will review the evidence and contact you shortly.
                                </AlertDescription>
                            </Alert>
                        )}

                        {order.status === "CANCELLED" && (
                            <Alert className="bg-gray-100 border-gray-300">
                                <TimerOff className="h-4 w-4 text-gray-600" />
                                <AlertTitle>Order Cancelled</AlertTitle>
                                <AlertDescription>
                                    This order has been cancelled due to timeout or mutual agreement. Funds have been refunded to the buyer.
                                </AlertDescription>
                            </Alert>
                        )}

                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
