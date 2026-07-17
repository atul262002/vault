"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader, CreditCard, Building2, Smartphone, CheckCircle2 } from "lucide-react";

type PayoutData = {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsappNumber?: string | null;
  upiId?: string | null;
  bankAccountNumber?: string | null;
  ifscCode?: string | null;
  bankAccountHolder?: string | null;
  payoutMethod?: string | null;
};

export default function ProfilePage() {
  const [data, setData] = useState<PayoutData | null>(null);
  const [fetching, setFetching] = useState(true);

  // Payout form
  const [payoutMethod, setPayoutMethod] = useState<"UPI" | "BANK">("UPI");
  const [upiId, setUpiId] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [bankAccountHolder, setBankAccountHolder] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch("/api/user/payout-details");
        if (res.ok) {
          const json = await res.json();
          setData(json);
          if (json.payoutMethod === "UPI" || json.payoutMethod === "BANK") {
            setPayoutMethod(json.payoutMethod);
          }
          if (json.upiId) setUpiId(json.upiId);
          if (json.bankAccountNumber) setBankAccountNumber(json.bankAccountNumber);
          if (json.ifscCode) setIfscCode(json.ifscCode);
          if (json.bankAccountHolder) setBankAccountHolder(json.bankAccountHolder);
        }
      } catch {
        toast.error("Failed to load profile");
      } finally {
        setFetching(false);
      }
    };
    fetchProfile();
  }, []);

  const handleSavePayout = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    try {
      const body =
        payoutMethod === "UPI"
          ? { payoutMethod, upiId }
          : { payoutMethod, bankAccountNumber, ifscCode, bankAccountHolder };

      const res = await fetch("/api/user/payout-details", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.message || "Failed to save payout details");
        return;
      }
      toast.success("Payout details saved successfully!");
      setSaved(true);
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setSaving(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your account and payout details.</p>
      </div>

      {/* Account Info (read-only) */}
      <section className="rounded-xl border bg-gray-50 p-5 space-y-3">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Account</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          {data?.name && (
            <div>
              <p className="text-muted-foreground">Name</p>
              <p className="font-medium text-gray-900">{data.name}</p>
            </div>
          )}
          {data?.email && (
            <div>
              <p className="text-muted-foreground">Email</p>
              <p className="font-medium text-gray-900">{data.email}</p>
            </div>
          )}
          {data?.whatsappNumber && (
            <div>
              <p className="text-muted-foreground">WhatsApp</p>
              <p className="font-medium text-gray-900">{data.whatsappNumber}</p>
            </div>
          )}
        </div>
      </section>

      {/* Payout Details */}
      <section className="rounded-xl border p-5 space-y-5">
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-gray-500" />
          <h2 className="text-base font-semibold text-gray-900">Payout Details</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          This is how you'll receive your earnings when a sale is completed.
        </p>

        <form onSubmit={handleSavePayout} className="space-y-5">
          {/* Method selector */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setPayoutMethod("UPI")}
              className={`flex items-center gap-2 rounded-lg border p-3 text-sm font-medium transition-colors ${
                payoutMethod === "UPI"
                  ? "border-black bg-black text-white"
                  : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              <Smartphone className="h-4 w-4" />
              UPI
            </button>
            <button
              type="button"
              onClick={() => setPayoutMethod("BANK")}
              className={`flex items-center gap-2 rounded-lg border p-3 text-sm font-medium transition-colors ${
                payoutMethod === "BANK"
                  ? "border-black bg-black text-white"
                  : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              <Building2 className="h-4 w-4" />
              Bank Account
            </button>
          </div>

          {payoutMethod === "UPI" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">UPI ID</label>
              <Input
                placeholder="e.g. yourname@upi"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Format: handle@provider (e.g. john@oksbi, john@paytm)
              </p>
            </div>
          )}

          {payoutMethod === "BANK" && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Account Holder Name</label>
                <Input
                  placeholder="As on bank account"
                  value={bankAccountHolder}
                  onChange={(e) => setBankAccountHolder(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
                <Input
                  placeholder="Enter account number"
                  value={bankAccountNumber}
                  onChange={(e) => setBankAccountNumber(e.target.value.replace(/\D/g, ""))}
                  inputMode="numeric"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">IFSC Code</label>
                <Input
                  placeholder="e.g. SBIN0001234"
                  value={ifscCode}
                  onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                  maxLength={11}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  11 characters: first 4 letters (bank code) + 7 alphanumeric (branch code)
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={saving} className="flex-1">
              {saving ? (
                <span className="flex items-center gap-2">
                  <Loader className="h-4 w-4 animate-spin" />
                  Saving...
                </span>
              ) : (
                "Save Payout Details"
              )}
            </Button>
            {saved && (
              <span className="flex items-center gap-1 text-sm text-green-600">
                <CheckCircle2 className="h-4 w-4" />
                Saved
              </span>
            )}
          </div>
        </form>
      </section>
    </div>
  );
}
