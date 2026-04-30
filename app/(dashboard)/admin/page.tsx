"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { formatDistanceToNow } from "date-fns";
import { Loader2, LogOut, Search, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type DisputeStatus = "ACTIVE" | "UNDER_REVIEW" | "RESOLVED";
type DecisionType = "REFUND" | "CREDIT";

type DisputeListItem = {
  id: string;
  status: DisputeStatus;
  openedAt: string;
  transactionId: string;
  buyerReason: string;
  decisionType: DecisionType | null;
  order: {
    id: string;
    totalAmount: number;
    buyer: { name: string | null; email: string | null };
    orderItems: Array<{ product: { name: string; seller: { name: string | null; email: string | null } } }>;
  };
};

type DisputeDetail = DisputeListItem & {
  buyerEvidenceUrl: string | null;
  sellerEvidenceUrl: string | null;
  adminDecisionReason: string | null;
  notificationsLog: Array<{ id: string; toUserId: string; title: string; message: string; createdAt: string }> | null;
  messages: Array<{ id: string; sender: string; content: string; createdAt: string }> | null;
  order: DisputeListItem["order"] & {
    statusHistory: Array<{ id: string; fromStatus: string | null; toStatus: string; note: string | null; createdAt: string }>;
  };
};

export default function AdminPage() {
  const [authorized, setAuthorized] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [initialLoading, setInitialLoading] = useState(true);

  const [disputes, setDisputes] = useState<DisputeListItem[]>([]);
  const [stats, setStats] = useState({ activeDisputes: 0, resolvedThisWeek: 0, volumeThisWeek: 0 });
  const [selectedId, setSelectedId] = useState<string>("");
  const [detail, setDetail] = useState<DisputeDetail | null>(null);
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [messageSubject, setMessageSubject] = useState("Admin clarification requested");
  const [messageRecipient, setMessageRecipient] = useState<"BUYER" | "SELLER" | "BOTH">("BOTH");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);

  const selected = useMemo(() => disputes.find((d) => d.id === selectedId) || null, [disputes, selectedId]);
  const filteredDisputes = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return disputes;
    return disputes.filter((d) => {
      const productName = d.order.orderItems[0]?.product.name?.toLowerCase() || "";
      const buyerName = d.order.buyer.name?.toLowerCase() || "";
      const sellerName = d.order.orderItems[0]?.product.seller.name?.toLowerCase() || "";
      return (
        d.transactionId.toLowerCase().includes(query) ||
        productName.includes(query) ||
        buyerName.includes(query) ||
        sellerName.includes(query)
      );
    });
  }, [disputes, searchTerm]);

  const fetchDisputes = useCallback(async () => {
    const res = await axios.get("/api/admin/disputes");
    setDisputes(res.data.disputes || []);
    setStats(res.data.stats);
    const list = res.data.disputes || [];
    if (!selectedId && list.length) {
      setSelectedId(list[0].id);
    }
  }, [selectedId]);

  const fetchDetail = useCallback(async (id: string) => {
    const res = await axios.get(`/api/admin/disputes/${id}`);
    setDetail(res.data);
    setReason(res.data.adminDecisionReason || "");
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await fetchDisputes();
        setAuthorized(true);
      } catch {
        setAuthorized(false);
      } finally {
        setInitialLoading(false);
      }
    })();
  }, [fetchDisputes]);

  useEffect(() => {
    if (selectedId && authorized) {
      fetchDetail(selectedId).catch(() => null);
    }
  }, [selectedId, authorized, fetchDetail]);

  const handleLogin = async () => {
    setLoginError("");
    setLoading(true);
    try {
      await axios.post("/api/admin/login", { username, password });
      setAuthorized(true);
      await fetchDisputes();
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        setLoginError(error.response?.data?.message || "Login failed");
      } else {
        setLoginError("Login failed");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await axios.post("/api/admin/logout");
    setAuthorized(false);
    setDetail(null);
    setDisputes([]);
  };

  const setStatus = async (status: DisputeStatus) => {
    if (!detail) return;
    setLoading(true);
    await axios.post(`/api/admin/disputes/${detail.id}/status`, { status });
    await fetchDisputes();
    await fetchDetail(detail.id);
    setLoading(false);
  };

  const sendMessage = async () => {
    if (!detail || !message.trim()) return;
    setLoading(true);
    await axios.post(`/api/admin/disputes/${detail.id}/messages`, {
      content: message.trim(),
      recipient: messageRecipient,
      subject: messageSubject.trim() || "Admin clarification requested",
    });
    setMessage("");
    await fetchDetail(detail.id);
    await fetchDisputes();
    setLoading(false);
  };

  const decide = async (decisionType: DecisionType) => {
    if (!detail) return;
    if (reason.trim().length < 10) {
      alert("Decision reason must be at least 10 characters.");
      return;
    }
    const confirmText =
      decisionType === "REFUND"
        ? `You are about to refund ₹${detail.order.totalAmount} to buyer. This is irreversible. Confirm?`
        : `You are about to pay ₹${detail.order.totalAmount} to seller. This is irreversible. Confirm?`;
    if (!window.confirm(confirmText)) return;

    setLoading(true);
    try {
      await axios.post(`/api/admin/disputes/${detail.id}/decision`, {
        decisionType,
        reason: reason.trim(),
      });
      await fetchDisputes();
      await fetchDetail(detail.id);
    } finally {
      setLoading(false);
    }
  };

  const getAgeColor = (openedAt: string) => {
    const hours = (Date.now() - new Date(openedAt).getTime()) / (1000 * 60 * 60);
    if (hours < 24) return "text-green-600";
    if (hours <= 36) return "text-amber-600";
    return "text-red-600";
  };
  const statusPillClass = (status: DisputeStatus) => {
    if (status === "ACTIVE") return "bg-red-100 text-red-700 border-red-200";
    if (status === "UNDER_REVIEW") return "bg-amber-100 text-amber-700 border-amber-200";
    return "bg-green-100 text-green-700 border-green-200";
  };

  if (initialLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="mx-auto mt-24 max-w-md p-6">
        <Card>
          <CardHeader>
            <div className="mb-2 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-500" />
              <span className="text-xs uppercase tracking-widest text-muted-foreground">Secure Access</span>
            </div>
            <CardTitle className="text-2xl">Vault Admin Panel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Username</Label>
              <Input value={username} onChange={(e) => setUsername(e.target.value)} />
            </div>
            <div>
              <Label>Password</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            {loginError ? <p className="text-sm text-red-500">{loginError}</p> : null}
            <Button onClick={handleLogin} className="w-full" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 md:space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dispute Dashboard</h1>
          <p className="text-sm text-muted-foreground">Investigate disputes, communicate with both parties, and resolve with audit-safe actions.</p>
        </div>
        <Button variant="outline" onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Active disputes</p><p className="text-2xl font-bold">{stats.activeDisputes}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Resolved this week</p><p className="text-2xl font-bold">{stats.resolvedThisWeek}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Transaction volume this week</p><p className="text-2xl font-bold">₹{stats.volumeThisWeek.toFixed(2)}</p></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Disputes</CardTitle>
            <div className="relative mt-2">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search order, buyer, seller..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
          </CardHeader>
          <CardContent className="max-h-[74vh] space-y-3 overflow-auto">
            {filteredDisputes.map((d) => (
              <button key={d.id} onClick={() => setSelectedId(d.id)} className={`w-full rounded-xl border p-3 text-left transition-all hover:shadow-sm ${selected?.id === d.id ? "border-zinc-800 bg-zinc-50" : "border-zinc-200 bg-white"}`}>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="line-clamp-1 font-semibold">{d.order.orderItems[0]?.product.name || d.transactionId}</p>
                  <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${statusPillClass(d.status)}`}>{d.status.replace("_", " ")}</span>
                </div>
                <p className="text-xs text-muted-foreground">Order: {d.transactionId.slice(0, 8)}</p>
                <p className={`mt-1 text-xs font-medium ${getAgeColor(d.openedAt)}`}>{formatDistanceToNow(new Date(d.openedAt), { addSuffix: true })}</p>
              </button>
            ))}
            {!filteredDisputes.length ? (
              <p className="text-sm text-muted-foreground">No disputes found for this filter.</p>
            ) : null}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Dispute Record View</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            {!detail ? <p>Select a dispute to view details.</p> : (
              <>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div className="rounded-lg border bg-zinc-50 p-3"><p className="text-xs text-muted-foreground">Buyer</p><p className="font-medium">{detail.order.buyer.name || "Unknown"}</p></div>
                  <div className="rounded-lg border bg-zinc-50 p-3"><p className="text-xs text-muted-foreground">Seller</p><p className="font-medium">{detail.order.orderItems[0]?.product.seller.name || "Unknown"}</p></div>
                  <div className="rounded-lg border bg-zinc-50 p-3"><p className="text-xs text-muted-foreground">Dispute amount</p><p className="font-semibold">₹{detail.order.totalAmount.toFixed(2)}</p></div>
                </div>

                <div>
                  <Label>Buyer reason</Label>
                  <p className="mt-1 rounded-lg border bg-zinc-50 p-3 text-sm">{detail.buyerReason}</p>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="rounded-lg border p-3">
                    <p className="mb-2 text-sm font-medium">Buyer counter-evidence</p>
                    {detail.buyerEvidenceUrl ? <a className="text-sm text-blue-600 underline" href={detail.buyerEvidenceUrl} target="_blank" rel="noreferrer">Open buyer evidence</a> : <p className="text-sm text-muted-foreground">Not provided</p>}
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="mb-2 text-sm font-medium">Seller screen recording</p>
                    {detail.sellerEvidenceUrl ? <video controls className="max-h-52 w-full rounded border" src={detail.sellerEvidenceUrl} /> : <p className="text-sm text-muted-foreground">Not provided</p>}
                  </div>
                </div>

                <div>
                  <Label>Dispute status control</Label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button variant="outline" disabled={detail.status === "RESOLVED" || loading} onClick={() => setStatus("ACTIVE")}>Active</Button>
                    <Button variant="outline" disabled={detail.status === "RESOLVED" || loading} onClick={() => setStatus("UNDER_REVIEW")}>Under Review</Button>
                    <Button variant="outline" disabled>Resolved (auto after decision)</Button>
                    <span className={`ml-auto rounded-full border px-3 py-1 text-xs font-semibold ${statusPillClass(detail.status)}`}>
                      {detail.status.replace("_", " ")}
                    </span>
                  </div>
                </div>

                <div>
                  <Label>Transaction timeline</Label>
                  <div className="mt-2 max-h-56 space-y-2 overflow-auto rounded-lg border p-3">
                    {detail.order.statusHistory.map((s) => (
                      <div key={s.id} className="text-sm">
                        <span className="font-semibold">{s.toStatus.replace(/_/g, " ")}</span>{" "}
                        <span className="text-muted-foreground">({new Date(s.createdAt).toLocaleString()})</span>
                        {s.note ? <p className="text-xs text-muted-foreground">{s.note}</p> : null}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Messaging & official notifications</Label>
                  <div className="mt-2 max-h-40 space-y-2 overflow-auto rounded-lg border p-3">
                    {(detail.messages || []).map((m) => (
                      <p key={m.id} className="text-sm"><span className="font-semibold">{m.sender}:</span> {m.content} <span className="text-xs text-muted-foreground">({new Date(m.createdAt).toLocaleString()})</span></p>
                    ))}
                  </div>
                  <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
                    <Input value={messageSubject} onChange={(e) => setMessageSubject(e.target.value)} placeholder="Notification subject" disabled={detail.status === "RESOLVED"} />
                    <select
                      value={messageRecipient}
                      onChange={(e) => setMessageRecipient(e.target.value as "BUYER" | "SELLER" | "BOTH")}
                      className="h-9 rounded-md border bg-background px-3 text-sm"
                      disabled={detail.status === "RESOLVED"}
                    >
                      <option value="BOTH">Send to both buyer and seller</option>
                      <option value="BUYER">Send only buyer</option>
                      <option value="SELLER">Send only seller</option>
                    </select>
                    <Button onClick={sendMessage} disabled={detail.status === "RESOLVED" || loading || !message.trim()}>
                      {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Send notification
                    </Button>
                  </div>
                  <div className="mt-2">
                    <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Type clarification request or required next steps..." disabled={detail.status === "RESOLVED"} />
                  </div>
                </div>

                <div>
                  <Label>Written decision reason (min 10 chars)</Label>
                  <Textarea value={reason} onChange={(e) => setReason(e.target.value)} />
                  <div className="mt-2 flex gap-2">
                    <Button disabled={loading || detail.status === "RESOLVED" || reason.trim().length < 10 || !!detail.decisionType} onClick={() => decide("REFUND")}>
                      REFUND
                    </Button>
                    <Button disabled={loading || detail.status === "RESOLVED" || reason.trim().length < 10 || !!detail.decisionType} onClick={() => decide("CREDIT")} variant="secondary">
                      CREDIT
                    </Button>
                  </div>
                </div>

                <div>
                  <Label>Notifications sent log</Label>
                  <div className="mt-2 max-h-44 space-y-2 overflow-auto rounded-lg border p-3">
                    {(detail.notificationsLog || []).map((n) => (
                      <p key={n.id} className="text-sm">{new Date(n.createdAt).toLocaleString()} - {n.title}: {n.message}</p>
                    ))}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
