"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader, MessageCircle, ShieldCheck } from "lucide-react";

export default function OnboardingPage() {
  const router = useRouter();
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const validate = (value: string) => {
    const raw = value.replace(/^\+91/, "").replace(/\s/g, "");
    if (!raw) return "WhatsApp number is required";
    if (!/^[6-9]\d{9}$/.test(raw)) return "Enter a valid 10-digit Indian mobile number (starts with 6–9)";
    return "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validate(whatsappNumber);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/user/update-profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ whatsappNumber }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Failed to save. Please try again.");
        return;
      }
      toast.success("WhatsApp number saved successfully!");
      router.push("/dashboard");
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary p-4">
      <div className="w-full max-w-md bg-card text-card-foreground rounded-2xl shadow-xl p-8">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
            <MessageCircle className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-center text-card-foreground mb-1">
          One last thing 👋
        </h1>
        <p className="text-center text-muted-foreground text-sm mb-6">
          Add your WhatsApp number to complete your profile. This is required to receive
          transaction updates and assist with dispute resolution.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="whatsapp" className="block text-sm font-medium text-card-foreground mb-1">
              WhatsApp Number
            </label>
            <div className="flex gap-2">
              <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-muted-foreground text-sm">
                +91
              </span>
              <Input
                id="whatsapp"
                type="tel"
                placeholder="9876543210"
                className="rounded-l-none"
                value={whatsappNumber.replace(/^\+91/, "")}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                  setWhatsappNumber(val);
                  setError("");
                }}
                maxLength={10}
                inputMode="numeric"
              />
            </div>
            {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
          </div>

          <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
            <ShieldCheck className="h-4 w-4 mt-0.5 flex-shrink-0 text-amber-600" />
            <span>
              Used <strong>only</strong> for transaction updates and dispute resolution — not for marketing.
            </span>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={loading || !whatsappNumber}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader className="h-4 w-4 animate-spin" />
                Saving...
              </span>
            ) : (
              "Continue to Dashboard"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
