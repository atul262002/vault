"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useClerk } from "@clerk/nextjs";
import {
  Loader, CreditCard, Building2, Smartphone, CheckCircle2,
  Pencil, X, LogOut, ShieldCheck, History, User, Mail,
  Phone, AlertTriangle, Lock
} from "lucide-react";

type ProfileData = {
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

type AuditLog = {
  id: string;
  changedAt: string;
  changeDetails: string;
};

// ── Inline editable field ──────────────────────────────────────────────────
function EditableField({
  label, value, placeholder, icon, type = "text",
  onSave, hint, locked = false,
}: {
  label: string;
  value: string;
  placeholder: string;
  icon: React.ReactNode;
  type?: string;
  onSave: (v: string) => Promise<void>;
  hint?: string;
  locked?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (draft === value) { setEditing(false); return; }
    setSaving(true);
    try {
      await onSave(draft);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2 text-xs text-gray-400">
          {icon}
          {label}
        </div>
        {locked ? (
          <span className="flex items-center gap-1 text-xs text-gray-600">
            <Lock className="h-3 w-3" /> Locked
          </span>
        ) : editing ? (
          <div className="flex gap-2">
            <button onClick={() => { setEditing(false); setDraft(value); }}
              className="text-gray-500 hover:text-gray-300 transition">
              <X className="h-3.5 w-3.5" />
            </button>
            <button onClick={handleSave} disabled={saving}
              className="text-green-400 hover:text-green-300 transition">
              {saving ? <Loader className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
            </button>
          </div>
        ) : (
          <button onClick={() => { setDraft(value); setEditing(true); }}
            className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition">
            <Pencil className="h-3 w-3" /> Edit
          </button>
        )}
      </div>
      {editing ? (
        <input
          type={type}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          autoFocus
          className="w-full bg-transparent text-sm text-white placeholder-gray-600 outline-none border-b border-white/20 pb-1 mt-1"
          placeholder={placeholder}
          onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") { setEditing(false); setDraft(value); } }}
        />
      ) : (
        <p className="text-sm text-white mt-0.5">
          {value || <span className="text-gray-600 italic">{placeholder}</span>}
        </p>
      )}
      {hint && !editing && <p className="text-[10px] text-gray-600 mt-1">{hint}</p>}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const { signOut } = useClerk();
  const [data, setData] = useState<ProfileData | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [fetching, setFetching] = useState(true);
  const [showAudit, setShowAudit] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  // Payout form
  const [payoutMethod, setPayoutMethod] = useState<"UPI" | "BANK">("UPI");
  const [upiId, setUpiId] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [bankAccountHolder, setBankAccountHolder] = useState("");
  const [savingPayout, setSavingPayout] = useState(false);
  const [payoutSaved, setPayoutSaved] = useState(false);

  const fetchProfile = async () => {
    try {
      const res = await fetch("/api/user/payout-details");
      if (res.ok) {
        const json: ProfileData = await res.json();
        setData(json);
        if (json.payoutMethod === "UPI" || json.payoutMethod === "BANK") setPayoutMethod(json.payoutMethod);
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

  const fetchAuditLogs = async () => {
    try {
      const res = await fetch("/api/user/audit-log");
      if (res.ok) setAuditLogs(await res.json());
    } catch { /* silent */ }
  };

  useEffect(() => {
    fetchProfile();
    fetchAuditLogs();
  }, []);

  // Save contact field (whatsapp or phone)
  const saveContactField = async (field: "whatsappNumber" | "phone", value: string) => {
    const res = await fetch("/api/user/update-profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    const json = await res.json();
    if (!res.ok) { toast.error(json.message || "Failed to update"); throw new Error(json.message); }
    toast.success("Updated successfully");
    setData(prev => prev ? { ...prev, [field]: json[field] } : prev);
    fetchAuditLogs();
  };

  // Save payout details
  const handleSavePayout = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPayout(true);
    setPayoutSaved(false);
    try {
      const body = payoutMethod === "UPI"
        ? { payoutMethod, upiId }
        : { payoutMethod, bankAccountNumber, ifscCode, bankAccountHolder };

      const res = await fetch("/api/user/payout-details", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.message || "Failed to save"); return; }
      toast.success("Payout details saved!");
      setPayoutSaved(true);
      fetchAuditLogs();
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setSavingPayout(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader className="h-6 w-6 animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-5 space-y-6 pb-16">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Profile</h1>
          <p className="text-xs text-gray-500 mt-0.5">Manage your account, contacts & payout details</p>
        </div>
        <Button
          variant="ghost"
          onClick={async () => { setSigningOut(true); await signOut({ redirectUrl: "/" }); }}
          disabled={signingOut}
          className="text-red-400 hover:text-red-300 hover:bg-red-950/40 gap-2 text-sm"
        >
          {signingOut ? <Loader className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
          Sign Out
        </Button>
      </div>

      {/* ── Account Info (read-only) ── */}
      <section className="space-y-2">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest px-1">Account</h2>
        <div className="rounded-xl border border-white/10 bg-white/5 divide-y divide-white/5">
          {data?.name && (
            <div className="flex items-center gap-3 px-4 py-3">
              <User className="h-4 w-4 text-gray-500" />
              <div>
                <p className="text-[10px] text-gray-500">Full Name</p>
                <p className="text-sm text-white font-medium">{data.name}</p>
              </div>
            </div>
          )}
          {data?.email && (
            <div className="flex items-center gap-3 px-4 py-3">
              <Mail className="h-4 w-4 text-gray-500" />
              <div className="flex-1">
                <p className="text-[10px] text-gray-500">Email</p>
                <p className="text-sm text-white font-medium">{data.email}</p>
              </div>
              <span className="text-[10px] text-gray-600 flex items-center gap-1">
                <Lock className="h-3 w-3" /> Managed by Clerk
              </span>
            </div>
          )}
        </div>
      </section>

      {/* ── Contact Details (editable) ── */}
      <section className="space-y-2">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest px-1">Contact Details</h2>
        <div className="space-y-2">
          <EditableField
            label="WhatsApp Number"
            value={data?.whatsappNumber || ""}
            placeholder="+91 98765 43210"
            icon={<Smartphone className="h-3.5 w-3.5" />}
            type="tel"
            hint="Used for ticket transfer and dispute resolution"
            onSave={(v) => saveContactField("whatsappNumber", v)}
          />
          <EditableField
            label="Phone Number"
            value={data?.phone || ""}
            placeholder="+91 98765 43210"
            icon={<Phone className="h-3.5 w-3.5" />}
            type="tel"
            hint="Your registered mobile number"
            onSave={(v) => saveContactField("phone", v)}
          />
        </div>

        {/* Anti-scam notice */}
        <div className="flex gap-2 items-start rounded-lg border border-yellow-600/30 bg-yellow-950/20 px-3 py-2.5 mt-1">
          <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-yellow-400 leading-relaxed">
            All contact changes are permanently logged. Vault keeps a full history of your details for fraud investigation and dispute resolution.
          </p>
        </div>
      </section>

      {/* ── Payout Details ── */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest px-1">Payout Details</h2>

        <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-4">
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-indigo-400" />
            <p className="text-sm font-medium text-white">How you receive earnings</p>
          </div>

          <form onSubmit={handleSavePayout} className="space-y-4">
            {/* Method toggle */}
            <div className="grid grid-cols-2 gap-2">
              {(["UPI", "BANK"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setPayoutMethod(m)}
                  className={`flex items-center justify-center gap-2 rounded-lg border p-2.5 text-sm font-medium transition-all ${
                    payoutMethod === m
                      ? "border-indigo-500 bg-indigo-600 text-white"
                      : "border-white/10 bg-white/5 text-gray-400 hover:bg-white/10"
                  }`}
                >
                  {m === "UPI" ? <Smartphone className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}
                  {m === "UPI" ? "UPI" : "Bank Account"}
                </button>
              ))}
            </div>

            {payoutMethod === "UPI" && (
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">UPI ID</label>
                <Input
                  placeholder="yourname@upi"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus-visible:ring-indigo-500"
                />
                <p className="mt-1 text-[10px] text-gray-600">e.g. john@oksbi, john@paytm</p>
              </div>
            )}

            {payoutMethod === "BANK" && (
              <div className="space-y-3">
                {[
                  { label: "Account Holder Name", value: bankAccountHolder, setter: setBankAccountHolder, placeholder: "As on bank account", transform: (v: string) => v },
                  { label: "Account Number", value: bankAccountNumber, setter: setBankAccountNumber, placeholder: "Enter account number", transform: (v: string) => v.replace(/\D/g, "") },
                  { label: "IFSC Code", value: ifscCode, setter: setIfscCode, placeholder: "e.g. SBIN0001234", transform: (v: string) => v.toUpperCase() },
                ].map(({ label, value, setter, placeholder, transform }) => (
                  <div key={label}>
                    <label className="block text-xs text-gray-400 mb-1.5">{label}</label>
                    <Input
                      placeholder={placeholder}
                      value={value}
                      onChange={(e) => setter(transform(e.target.value))}
                      className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus-visible:ring-indigo-500"
                    />
                  </div>
                ))}
              </div>
            )}

            <Button
              type="submit"
              disabled={savingPayout}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white gap-2"
            >
              {savingPayout
                ? <><Loader className="h-4 w-4 animate-spin" /> Saving...</>
                : payoutSaved
                ? <><CheckCircle2 className="h-4 w-4" /> Saved!</>
                : "Save Payout Details"}
            </Button>
          </form>
        </div>
      </section>

      {/* ── Audit / Change History ── */}
      <section className="space-y-2">
        <button
          onClick={() => setShowAudit(!showAudit)}
          className="w-full flex items-center justify-between px-1 text-xs font-semibold text-gray-500 uppercase tracking-widest hover:text-gray-400 transition"
        >
          <div className="flex items-center gap-2">
            <History className="h-3.5 w-3.5" />
            Change History (Anti-Scam Log)
          </div>
          <span className="text-[10px] normal-case">{showAudit ? "Hide" : "Show"}</span>
        </button>

        {showAudit && (
          <div className="rounded-xl border border-white/10 bg-[#111] overflow-hidden">
            {/* Explanation */}
            <div className="flex gap-2 items-start px-4 py-3 border-b border-white/5 bg-emerald-950/20">
              <ShieldCheck className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-emerald-300 leading-relaxed">
                Vault maintains a permanent, tamper-proof log of all payout and contact changes. This ensures accountability — if any fraudulent activity occurs, we have a complete trail of who changed what and when.
              </p>
            </div>

            {auditLogs.length === 0 ? (
              <p className="text-center text-gray-600 text-xs py-6">No changes recorded yet.</p>
            ) : (
              <ul className="divide-y divide-white/5 max-h-72 overflow-y-auto">
                {auditLogs.map((log) => (
                  <li key={log.id} className="flex gap-3 px-4 py-3">
                    <div className="mt-0.5 h-1.5 w-1.5 rounded-full bg-indigo-400 flex-shrink-0 mt-2" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-300 break-words">{log.changeDetails}</p>
                      <p className="text-[10px] text-gray-600 mt-0.5">
                        {new Date(log.changedAt).toLocaleString("en-IN", {
                          day: "numeric", month: "short", year: "numeric",
                          hour: "2-digit", minute: "2-digit"
                        })}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

    </div>
  );
}
