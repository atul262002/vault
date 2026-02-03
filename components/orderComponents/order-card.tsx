"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import axios from "axios";
import { Loader } from "lucide-react";
import { ImageKitProvider, IKUpload } from "imagekitio-next";
import { Progress } from "@/components/ui/progress";

const publicKey = process.env.NEXT_PUBLIC_PUBLIC_KEY!;
const urlEndpoint = process.env.NEXT_PUBLIC_URL_ENDPOINT!;

// Authenticator for ImageKit
const authenticator = async () => {
    try {
        const response = await axios.get("/api/imagekit-auth");
        if (!response.data) throw new Error("Auth failed");
        return response.data;
    } catch (error: any) {
        throw new Error("Auth failed");
    }
};

interface OrderCardProps {
    order: any; // Using any for simplicity now, strictly should allow the Order type
    currentUser: any;
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
        const interval = setInterval(() => {
            const now = new Date().getTime();
            let targetTime = 0;
            let showTimer = false;

            if (order.status === "TRANSFER_INITIATED" && order.transferStartedAt) {
                // T-15 mins for Seller
                // T-15 mins for Buyer but with 5 min lag display logic
                const startTime = new Date(order.transferStartedAt).getTime();
                const deadline = startTime + 15 * 60 * 1000;

                if (isSeller) {
                    targetTime = deadline;
                    showTimer = true;
                } else if (isBuyer) {
                    // Buyer Lag: Show countdown only after 5 mins passed
                    if (now > startTime + 5 * 60 * 1000) {
                        targetTime = deadline;
                        showTimer = true;
                    } else {
                        setTimeLeft("Waiting for transfer details...");
                        return;
                    }
                }
            } else if (order.status === "EVIDENCE_UPLOADED" && order.evidenceUploadedAt) {
                // T-10 mins for Buyer to confirm
                const startTime = new Date(order.evidenceUploadedAt).getTime();
                const deadline = startTime + 10 * 60 * 1000;
                targetTime = deadline;
                if (isBuyer) showTimer = true;
                // Seller just waits
            }

            if (showTimer) {
                const distance = targetTime - now;
                if (distance < 0) {
                    setTimeLeft("Time Expired");
                    // Could trigger auto-action here
                } else {
                    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
                    const seconds = Math.floor((distance % (1000 * 60)) / 1000);
                    setTimeLeft(`${minutes}m ${seconds}s`);
                }
            } else {
                if (!timeLeft) setTimeLeft(null);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [order, isSeller, isBuyer]);

    const handleInitiateTransfer = async () => {
        try {
            setLoading(true);
            await axios.post(`/api/orders/${order.id}/initiate-transfer`);
            toast.success("Transfer initiated! You have 15 minutes.");
            refreshOrders();
        } catch (error) {
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
        } catch (error) {
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
                await axios.post(`/api/orders/${order.id}/dispute`);
                toast.success("Dispute raised. Support will review.");
            }
            refreshOrders();
        } catch (error) {
            toast.error("Process failed");
        } finally {
            setLoading(false);
        }
    };

    const onUploadSuccess = (res: any) => {
        setIsUploading(false);
        setUploadProgress(100);
        if (res?.url) {
            setEvidenceUrl(res.url);
            toast.success("File uploaded successfully");
        }
    };

    const onUploadError = (err: any) => {
        setIsUploading(false);
        console.error(err);
        toast.error("Upload failed");
    };

    return (
        <Card className="w-full shadow-md border border-gray-200 p-4">
            <CardHeader className="p-0 pb-4">
                <CardTitle className="flex justify-between items-center text-lg">
                    <span>Order #{order.id.slice(0, 8)}</span>
                    <span className={`px-2 py-1 rounded text-xs font-bold ${order.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                            order.status === 'DISPUTED' ? 'bg-red-100 text-red-800' :
                                'bg-blue-100 text-blue-800'
                        }`}>
                        {order.status.replace(/_/g, " ")}
                    </span>
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0 space-y-4">
                {order.orderItems.map((item: any) => (
                    <div key={item.id} className="flex gap-4">
                        <div className="w-20 h-20 relative bg-gray-100 rounded">
                            {item.product.imageUrl && <Image src={item.product.imageUrl} alt={item.product.name} fill className="object-cover rounded" />}
                        </div>
                        <div>
                            <p className="font-semibold">{item.product.name}</p>
                            <p className="text-sm text-gray-500">₹{item.price}</p>
                            {order.ticketPartner && <p className="text-sm">Platform: {order.ticketPartner}</p>}
                            {order.transferDetails && <p className="text-sm">Transfer To: {order.transferDetails}</p>}
                        </div>
                    </div>
                ))}

                {/* Seller Actions */}
                {isSeller && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
                        <h4 className="font-bold mb-2">Seller Action Required</h4>

                        {order.status === "WAITING_FOR_TRANSFER" && (
                            <div>
                                <div className="bg-yellow-50 p-3 text-sm text-yellow-800 rounded mb-4">
                                    <p className="font-bold">PLEASE READ CAREFULLY</p>
                                    <ul className="list-disc ml-4 mt-2 space-y-1">
                                        <li>Please take a screen recording of transferring the ticket to avoid disputes.</li>
                                        <li>Buyer has made payment. Transfer to: <strong>{order.transferDetails || "N/A"}</strong></li>
                                        <li>You must complete transfer within 15 minutes of clicking Initiate.</li>
                                    </ul>
                                </div>
                                <Button onClick={handleInitiateTransfer} disabled={loading} className="w-full">
                                    {loading ? <Loader className="animate-spin mr-2" /> : null} INITIATE TRANSFER
                                </Button>
                                <p className="text-xs text-center text-gray-500 mt-1">click here to initiate transfer</p>
                            </div>
                        )}

                        {order.status === "TRANSFER_INITIATED" && (
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <span className="font-bold text-red-600">Time Remaining: {timeLeft}</span>
                                </div>
                                <p className="text-sm mb-4">Please complete the transfer and upload evidence within the time limit.</p>

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
                        {order.status === "EVIDENCE_UPLOADED" && (
                            <p className="text-sm text-gray-600">Proof submitted. Waiting for buyer confirmation.</p>
                        )}
                    </div>
                )}

                {/* Buyer Actions */}
                {isBuyer && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
                        {order.status === "WAITING_FOR_TRANSFER" && (
                            <div className="bg-blue-50 p-3 text-sm text-blue-800 rounded">
                                Money secured with Vault. Waiting for seller to initiate transfer.
                            </div>
                        )}

                        {order.status === "TRANSFER_INITIATED" && (
                            <div>
                                <p className="font-bold text-blue-600 mb-2">Transfer Initiated</p>
                                {timeLeft ? (
                                    <p className="text-red-500">Seller has approx {timeLeft} left to transfer.</p>
                                ) : (
                                    <p className="text-gray-500">Seller is preparing transfer...</p>
                                )}
                            </div>
                        )}

                        {order.status === "EVIDENCE_UPLOADED" && (
                            <div>
                                <p className="font-bold mb-2">Seller has completed transfer. Please confirm delivery.</p>
                                <p className="text-red-500 font-bold mb-4">Auto-confirm in: {timeLeft}</p>
                                <p className="text-xs text-gray-500 mb-4">If no reply within 10 mins funds will be released to seller.</p>
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

                        {order.status === "COMPLETED" && (
                            <div className="bg-green-50 p-3 text-green-800 rounded">
                                Order Complete!
                            </div>
                        )}

                        {order.status === "DISPUTED" && (
                            <div className="bg-red-50 p-3 text-red-800 rounded">
                                Dispute raised. We are reviewing the evidence.
                            </div>
                        )}
                    </div>
                )}

            </CardContent>
        </Card>
    );
}
