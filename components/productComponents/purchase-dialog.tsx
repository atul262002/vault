"use client";
import React, { useState } from "react";
import Image from "next/image";
import { Products } from "@prisma/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  MapPin,
  CalendarDays,
  Clock,
  Ticket,
  Store,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  ArrowLeft,
  Lock,
  Pencil,
} from "lucide-react";

interface PurchaseDialogProps {
  product: Products | null;
  onClose: () => void;
  onPay: (receiverName: string, receiverPhone: string) => void;
  isRazorpayLoading: boolean;
  isRazorpayReady: boolean;
  defaultName?: string;
  defaultPhone?: string;
}

export default function PurchaseDialog({
  product,
  onClose,
  onPay,
  isRazorpayLoading,
  isRazorpayReady,
  defaultName = "",
  defaultPhone = "",
}: PurchaseDialogProps) {
  const [receiverName, setReceiverName] = useState(defaultName);
  const [receiverPhone, setReceiverPhone] = useState(defaultPhone);
  const [editingName, setEditingName] = useState(false);
  const [editingPhone, setEditingPhone] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  if (!product) return null;

  const canPay =
    termsAccepted &&
    receiverName.trim().length > 0 &&
    receiverPhone.trim().length > 0 &&
    isRazorpayReady &&
    !isRazorpayLoading;

  const handleProceed = () => {
    if (!canPay) return;
    onPay(receiverName.trim(), receiverPhone.trim());
  };

  return (
    <Dialog open={!!product} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-lg w-full max-h-[95vh] p-0 overflow-hidden flex flex-col bg-background border border-border text-foreground rounded-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 pt-5 pb-3 border-b border-border">
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-secondary transition text-muted-foreground hover:text-foreground"
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <DialogTitle className="text-base font-semibold text-foreground leading-tight">
              Purchase Ticket
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Complete your purchase safely</p>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">

          {/* ── SECTION 1: Event Details ── */}
          <section>
            <h2 className="text-sm font-semibold text-muted-foreground mb-3">
              1. Event Details
            </h2>
            <div className="rounded-xl border border-border bg-secondary overflow-hidden">
              {/* Image + name row */}
              <div className="flex gap-3 p-4 border-b border-border">
                <div className="relative w-24 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-secondary">
                  {(product.imageUrl || product.image) ? (
                    <Image
                      src={product.imageUrl || product.image || ""}
                      alt={product.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Ticket className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground text-sm leading-snug line-clamp-3">
                    {product.name}
                  </p>
                  <p className="mt-2 text-lg font-bold text-green-400">
                    ₹{(product.price * 1.05).toFixed(0)}
                    <span className="text-xs font-normal text-muted-foreground ml-1">(incl. 5% fee)</span>
                  </p>
                </div>
              </div>

              {/* Detail rows */}
              <div className="divide-y divide-white/5">
                {product.categoryId && (
                  <DetailRow icon={<MapPin className="h-4 w-4 text-blue-400" />} label={product.categoryId} />
                )}
                {product.estimatedTime && (
                  <DetailRow icon={<CalendarDays className="h-4 w-4 text-purple-400" />} label={product.estimatedTime} />
                )}
                {product.refundPeriod && (
                  <DetailRow icon={<Clock className="h-4 w-4 text-yellow-400" />} label={product.refundPeriod} />
                )}
                {product.ticketQuantity && (
                  <DetailRow icon={<Ticket className="h-4 w-4 text-pink-400" />} label={`${product.ticketQuantity} Ticket${product.ticketQuantity > 1 ? "s" : ""}`} />
                )}
                {product.ticketPartner && (
                  <DetailRow icon={<Store className="h-4 w-4 text-orange-400" />} label={product.ticketPartner} />
                )}
              </div>
            </div>
          </section>

          {/* ── SECTION 2: Receiver Details ── */}
          <section>
            <h2 className="text-sm font-semibold text-muted-foreground mb-1">
              2. Receiver Details
            </h2>
            <p className="text-xs text-muted-foreground mb-3">
              Tickets will be transferred as per details entered below.
            </p>

            {/* Warning banner */}
            <div className="flex gap-2 items-start rounded-lg border border-yellow-600/40 bg-yellow-950/30 px-3 py-2.5 mb-4">
              <AlertTriangle className="h-4 w-4 text-yellow-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-yellow-300 leading-relaxed">
                Please ensure details are correctly entered — disputes arising from incorrectly entered details will not be considered
              </p>
            </div>

            <div className="space-y-3">
              {/* Name field */}
              <div className="rounded-xl border border-border bg-secondary px-4 py-3">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-muted-foreground font-medium">Name</span>
                  <button
                    onClick={() => setEditingName(!editingName)}
                    className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition"
                  >
                    <Pencil className="h-3 w-3" /> Edit
                  </button>
                </div>
                {editingName ? (
                  <input
                    type="text"
                    value={receiverName}
                    onChange={(e) => setReceiverName(e.target.value)}
                    onBlur={() => setEditingName(false)}
                    autoFocus
                    placeholder="Enter full name"
                    className="w-full bg-transparent text-sm text-foreground placeholder-gray-600 outline-none border-b border-border pb-1"
                  />
                ) : (
                  <p className="text-sm text-foreground">
                    {receiverName || <span className="text-muted-foreground">Enter full name</span>}
                  </p>
                )}
              </div>

              {/* Phone field */}
              <div className="rounded-xl border border-border bg-secondary px-4 py-3">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-muted-foreground font-medium">Registered Phone Number (with WhatsApp)</span>
                  <button
                    onClick={() => setEditingPhone(!editingPhone)}
                    className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 flex-shrink-0 ml-2 transition"
                  >
                    <Pencil className="h-3 w-3" /> Edit
                  </button>
                </div>
                {editingPhone ? (
                  <input
                    type="tel"
                    value={receiverPhone}
                    onChange={(e) => setReceiverPhone(e.target.value)}
                    onBlur={() => setEditingPhone(false)}
                    autoFocus
                    placeholder="Enter WhatsApp number"
                    className="w-full bg-transparent text-sm text-foreground placeholder-gray-600 outline-none border-b border-border pb-1"
                  />
                ) : (
                  <p className="text-sm text-foreground">
                    {receiverPhone || <span className="text-muted-foreground">Enter WhatsApp number</span>}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1.5">
                  Ticket transfer &amp; dispute resolution will happen on this number.
                </p>
              </div>
            </div>
          </section>

          {/* ── SECTION 3: Rules & Payment ── */}
          <section>
            <h2 className="text-sm font-semibold text-muted-foreground mb-3">
              3. Rules &amp; Payment
            </h2>

            {/* 3.1 Before you proceed */}
            <div className="mb-4">
              <p className="text-xs font-semibold text-green-400 mb-2">3.1 Before you proceed</p>
              <div className="space-y-2">
                {[
                  { title: "Upon payment your money is held safely with us.", sub: "We release it to the seller only after you confirm receipt." },
                  { title: "If the seller fails to comply you will receive a full refund." },
                  { title: "Vault is a mediator for ticket resale.", sub: "We are not affiliated with any seller, event organizer or booking partner." },
                ].map((item, i) => (
                  <div key={i} className="flex gap-2.5 items-start">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-foreground">{item.title}</p>
                      {item.sub && <p className="text-xs text-muted-foreground mt-0.5">{item.sub}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 3.2 T&C link */}
            <div className="mb-4">
              <p className="text-xs font-semibold text-green-400 mb-1">3.2 Terms &amp; Conditions</p>
              <p className="text-xs text-muted-foreground mb-1.5">For full details, please read our complete Terms &amp; Conditions.</p>
              <a
                href="/Vault_Buyer_Terms_and_Conditions.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300 underline underline-offset-2 transition"
              >
                View Terms &amp; Conditions <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>

            {/* 3.3 Accept Terms checkbox */}
            <div className="mb-4">
              <p className="text-xs font-semibold text-green-400 mb-2">3.3 Accept Terms</p>
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded accent-green-500 cursor-pointer"
                />
                <span className="text-sm text-muted-foreground group-hover:text-foreground transition select-none">
                  I have read the terms carefully and comply
                </span>
              </label>
            </div>
          </section>
        </div>

        {/* ── Sticky bottom: Proceed to Payment ── */}
        <div className="px-5 pb-5 pt-3 border-t border-border bg-background">
          <Button
            onClick={handleProceed}
            disabled={!canPay}
            className={`w-full h-12 text-sm font-semibold rounded-xl transition-all duration-200 flex flex-col items-center justify-center gap-0.5
              ${canPay
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-secondary text-muted-foreground cursor-not-allowed"
              }`}
          >
            {isRazorpayLoading ? (
              <span className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 animate-pulse" />
                Opening Payment...
              </span>
            ) : (
              <>
                <span className="flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  Proceed to Payment
                </span>
                <span className="text-[10px] font-normal opacity-60">Secure Razorpay Checkout</span>
              </>
            )}
          </Button>
          {!termsAccepted && (
            <p className="text-center text-xs text-muted-foreground mt-2">
              Accept terms above to enable payment
            </p>
          )}
          {termsAccepted && (!receiverName.trim() || !receiverPhone.trim()) && (
            <p className="text-center text-xs text-yellow-500 mt-2">
              Please fill in receiver details to proceed
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DetailRow({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <span className="flex-shrink-0">{icon}</span>
      <span className="text-sm text-foreground">{label}</span>
    </div>
  );
}
