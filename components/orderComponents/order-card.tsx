"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import axios from "axios";
import { Loader } from "lucide-react";
import { ImageKitProvider, IKUpload } from "imagekitio-next";
import { Progress } from "@/components/ui/progress";
import { BUYER_AUTO_CONFIRM_MINUTES, EVIDENCE_TIMEOUT_MINUTES, SELLER_TIMEOUT_MINUTES } from "@/lib/order-flow";

const publicKey = process.env.NEXT_PUBLIC_PUBLIC_KEY!;
const urlEndpoint = process.env.NEXT_PUBLIC_URL_ENDPOINT!;

// Authenticator for ImageKit
const authenticator = async () => {
    try {
        const response = await axios.get("/api/imagekit-auth");
        if (!response.data) throw new Error("Auth failed");
        return response.data;
    } catch {
        throw new Error("Auth failed");
    }
};

type OrderCardOrder = {
    id: string;
    status: string;
    totalAmount: number;
    buyerId: string;
    receiverName?: string;
    receiverPhone?: string;
    transferPendingAt?: string;
    transferStartedAt?: string;
    transferDelayUntil?: string;
    evidenceUploadedAt?: string;
    orderItems: Array<{
        id: string;
        productId: string;
        price: number;
        product: {
            sellerId: string;
            name: string;
            imageUrl?: string;
            listingId?: string;
            estimatedTime: string;
            refundPeriod: string;
            ticketPartner?: string;
        };
    }>;
};

type CurrentUser = {
    id?: string;
} | null;

type UploadResponse = {
    url?: string;
};

interface OrderCardProps {
    order: OrderCardOrder;
    currentUser: CurrentUser;
    refreshOrders: () => void;
}

export default function OrderCard({ order, currentUser, refreshOrders }: OrderCardProps) {
    const isSeller = order.orderItems[0].product.sellerId === currentUser?.id;
    const isBuyer = order.buyerId === currentUser?.id;

    const [loading, setLoading] = useState(false);
    const [timeLeft, setTimeLeft] = useState<string | null>(null);
    const [evidenceUrl, setEvidenceUrl] = useState<string>("");
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    // Timer Logic
    useEffect(() => {
        const calculateTimeLeft = () => {
            const now = new Date().getTime();
            let targetTime: number | null = null;
            let nextTimeLeft: string | null = null;

            if (order.status === "FUNDS_HELD" && order.transferPendingAt) {
                targetTime = new Date(order.transferPendingAt).getTime() + SELLER_TIMEOUT_MINUTES * 60 * 1000;
            } else if (order.status === "TRANSFER_IN_PROGRESS" && order.transferStartedAt) {
                targetTime = new Date(order.transferStartedAt).getTime() + EVIDENCE_TIMEOUT_MINUTES * 60 * 1000;
            } else if (order.status === "AWAITING_CONFIRMATION" && order.evidenceUploadedAt) {
                targetTime = new Date(order.evidenceUploadedAt).getTime() + BUYER_AUTO_CONFIRM_MINUTES * 60 * 1000;
            }

            if (targetTime) {
                const distance = targetTime - now;
                if (distance < 0) {
                    nextTimeLeft = "Time Expired";
                } else {
                    const minutes = Math.floor(distance / (1000 * 60));
                    const seconds = Math.floor((distance % (1000 * 60)) / 1000);
                    nextTimeLeft = `${minutes}m ${seconds}s`;
                }
            }

            setTimeLeft(nextTimeLeft);
        };

        calculateTimeLeft();
        const interval = setInterval(() => {
            calculateTimeLeft();
        }, 1000);

        return () => clearInterval(interval);
    }, [order]);

    const handleInitiateTransfer = async () => {
        try {
            setLoading(true);
            await axios.post(`/api/orders/${order.id}/initiate-transfer`);
            toast.success("Transfer initiated! You have 60 minutes to complete the transfer and upload evidence.");
            refreshOrders();
        } catch {
            toast.error("Failed to initiate transfer");
        } finally {
            setLoading(false);
        }
    };

    const handleUploadEvidence = async () => {
        if (!evidenceUrl) return toast.error("Please upload evidence first");
        try {
            setLoading(true);
            await axios.post(`/api/orders/${order.id}/upload-evidence`, { evidenceUrl });
            toast.success("Evidence uploaded!");
            refreshOrders();
        } catch {
            toast.error("Failed to upload evidence");
        } finally {
            setLoading(false);
        }
    };

    const handleConfirm = async (confirmed: boolean) => {
        try {
            setLoading(true);
            if (confirmed) {
                await axios.post(`/api/orders/${order.id}/confirm`);
                toast.success("Order confirmed! Funds released to seller.");
            } else {
                const disputeReason = window.prompt("Please briefly describe the issue with the transfer.");
                await axios.post(`/api/orders/${order.id}/dispute`, {
                    disputeReason: disputeReason || "Buyer reported transfer not received.",
                });
                toast.success("Dispute raised. Support will review.");
            }
            refreshOrders();
        } catch {
            toast.error("Process failed");
        } finally {
            setLoading(false);
        }
    };

    const onUploadSuccess = (res: UploadResponse) => {
        setIsUploading(false);
        setUploadProgress(100);
        if (res?.url) {
            setEvidenceUrl(res.url);
            toast.success("File uploaded successfully");
        }
    };

    const onUploadError = (err: unknown) => {
        setIsUploading(false);
        console.error(err);
        toast.error("Upload failed");
    };

    return (
        <Card className="w-full shadow-md border border-gray-200 p-4">
            <CardHeader className="p-0 pb-4">
                <CardTitle className="flex justify-between items-center text-lg">
                    <span>Order #{order.id.slice(0, 8)}</span>
                    <span className={`px-2 py-1 rounded text-xs font-bold ${order.status === 'COMPLETE' ? 'bg-green-100 text-green-800' :
                            ["DISPUTED", "SELLER_TIMEOUT", "EVIDENCE_TIMEOUT"].includes(order.status) ? 'bg-red-100 text-red-800' :
                                'bg-blue-100 text-blue-800'
                        }`}>
                        {order.status.replace(/_/g, " ")}
                    </span>
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0 space-y-4">
                {order.orderItems.map((item) => (
                    <div key={item.id} className="flex gap-4">
                        <div className="w-20 h-20 relative bg-gray-100 rounded">
                            {item.product.imageUrl && <Image src={item.product.imageUrl} alt={item.product.name} fill className="object-cover rounded" />}
                        </div>
                        <div>
                            <p className="font-semibold">{item.product.name}</p>
                            <p className="text-sm text-gray-500">₹{item.price}</p>
                            <p className="text-sm">Listing: {item.product.listingId || item.productId}</p>
                            <p className="text-sm">Event date: {item.product.estimatedTime}</p>
                            <p className="text-sm">Event time: {item.product.refundPeriod}</p>
                        </div>
                    </div>
                ))}

                {/* Seller Actions */}
                {isSeller && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
                        <h4 className="font-bold mb-2">Seller Action Required</h4>

                        {order.status === "FUNDS_HELD" && (
                            <div>
                                <div className="bg-yellow-50 p-3 text-sm text-yellow-800 rounded mb-4">
                                    <p className="font-bold">PLEASE READ CAREFULLY</p>
                                    <ul className="list-disc ml-4 mt-2 space-y-1">
                                        <li>Buyer has paid ₹{order.totalAmount}. Please transfer the ticket to {order.receiverName || "the buyer"} at {order.receiverPhone || "the provided number"} via {order.orderItems[0]?.product.ticketPartner || "the selected partner"}.</li>
                                        <li>Take a screen recording of the transfer process. Vault will not entertain disputes without clear evidence.</li>
                                        <li>You must initiate transfer within 30 minutes.</li>
                                        <li>Once you click INITIATE TRANSFER, a 15-minute timer starts for evidence upload.</li>
                                    </ul>
                                </div>
                                {timeLeft && (
                                    <p className="text-sm font-semibold text-red-600 mb-3">Time remaining: {timeLeft}</p>
                                )}
                                <Button onClick={handleInitiateTransfer} disabled={loading} className="w-full">
                                    {loading ? <Loader className="animate-spin mr-2" /> : null} INITIATE TRANSFER
                                </Button>
                            </div>
                        )}

                        {order.status === "TRANSFER_IN_PROGRESS" && (
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <span className="font-bold text-red-600">Time Remaining: {timeLeft}</span>
                                </div>
                                <p className="text-sm mb-4">Please complete the transfer and upload your screen recording evidence within 15 minutes.</p>

                                <div className="space-y-4">
                                    <ImageKitProvider urlEndpoint={urlEndpoint} publicKey={publicKey}>
                                        <div className={`border-2 border-dashed p-4 text-center rounded ${isUploading ? 'bg-gray-100' : 'bg-white'}`}>
                                            <IKUpload
                                                onError={onUploadError}
                                                onSuccess={onUploadSuccess}
                                                onUploadStart={() => setIsUploading(true)}
                                                onUploadProgress={(e) => setUploadProgress((e.loaded / e.total) * 100)}
                                                folder="/evidence"
                                                authenticator={authenticator}
                                                className="w-full"
                                            />
                                            {isUploading && <Progress value={uploadProgress} className="mt-2" />}
                                        </div>
                                    </ImageKitProvider>

                                    {evidenceUrl && (
                                        <p className="text-green-600 text-sm">Evidence Uploaded! Ready to submit.</p>
                                    )}

                                    <Button onClick={handleUploadEvidence} disabled={loading || !evidenceUrl} className="w-full">
                                        UPLOAD & SUBMIT
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Seller Done. Waiting for Buyer */}
                        {order.status === "AWAITING_CONFIRMATION" && (
                            <p className="text-sm text-gray-600">Proof submitted. Waiting for buyer confirmation.</p>
                        )}
                    </div>
                )}

                {/* Buyer Actions */}
                {isBuyer && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
                        {order.status === "FUNDS_HELD" && (
                            <div className="bg-blue-50 p-3 text-sm text-blue-800 rounded">
                                Your payment is secured with Vault. The seller has been notified to initiate transfer.
                                {timeLeft && <p className="mt-2 font-semibold">Seller time remaining: {timeLeft}</p>}
                            </div>
                        )}

                        {order.status === "TRANSFER_IN_PROGRESS" && (
                            <div>
                                <p className="font-bold text-blue-600 mb-2">Transfer Initiated</p>
                                {order.transferDelayUntil && new Date(order.transferDelayUntil).getTime() > Date.now() ? (
                                    <p className="text-gray-500">Seller has initiated the transfer. This stage becomes visible after a short 5-minute delay.</p>
                                ) : timeLeft ? (
                                    <p className="text-red-500">Seller has approx {timeLeft} left to complete transfer and upload evidence.</p>
                                ) : (
                                    <p className="text-gray-500">Seller is preparing transfer...</p>
                                )}
                            </div>
                        )}

                        {order.status === "AWAITING_CONFIRMATION" && (
                            <div>
                                <p className="font-bold mb-2">Seller has completed transfer. Please confirm delivery.</p>
                                <p className="text-red-500 font-bold mb-4">Auto-confirm in: {timeLeft}</p>
                                <p className="text-xs text-gray-500 mb-4">If no reply within 10 minutes, funds will be released to seller automatically.</p>
                                <div className="flex gap-4">
                                    <Button onClick={() => handleConfirm(true)} className="flex-1 bg-green-600 hover:bg-green-700" disabled={loading}>
                                        YES, I Received it
                                    </Button>
                                    <Button onClick={() => handleConfirm(false)} className="flex-1 bg-red-600 hover:bg-red-700" disabled={loading}>
                                        NO (Dispute)
                                    </Button>
                                </div>
                            </div>
                        )}

                        {order.status === "COMPLETE" && (
                            <div className="bg-green-50 p-3 text-green-800 rounded">
                                Order Complete!
                            </div>
                        )}

                        {order.status === "DISPUTED" && (
                            <div className="bg-red-50 p-3 text-red-800 rounded">
                                Dispute raised. We are reviewing the evidence.
                            </div>
                        )}

                        {order.status === "SELLER_TIMEOUT" && (
                            <div className="bg-red-50 p-3 text-red-800 rounded">
                                Seller did not initiate the transfer in time. Refund flow should be triggered.
                            </div>
                        )}

                        {order.status === "EVIDENCE_TIMEOUT" && (
                            <div className="bg-amber-50 p-3 text-amber-800 rounded">
                                Seller missed the evidence upload deadline. Vault will review the transaction manually.
                            </div>
                        )}
                    </div>
                )}

            </CardContent>
        </Card>
    );
}
