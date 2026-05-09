"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { formatDistanceToNow } from "date-fns";
import {
  AlertTriangle,
  ArrowDownAZ,
  ArrowUpAZ,
  Copy,
  Loader2,
  LogOut,
  RefreshCw,
  Search,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
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
  decidedBy: string | null;
  order: {
    id: string;
    status: string;
    totalAmount: number;
    platformFeeSeller: number;
    buyer: { name: string | null; email: string | null };
    orderItems: Array<{ price: number; product: { name: string; seller: { name: string | null; email: string | null } } }>;
  };
};

type DisputeDetail = DisputeListItem & {
  buyerEvidenceUrl: string | null;
  sellerEvidenceUrl: string | null;
  adminDecisionReason: string | null;
  decidedAt: string | null;
  resolvedAt: string | null;
  isLocked: boolean;
  notificationsLog: Array<{ id: string; toUserId: string; title: string; message: string; createdAt: string }> | null;
  messages: Array<{ id: string; sender: string; content: string; createdAt: string }> | null;
  order: DisputeListItem["order"] & {
    buyer: { id: string; name: string | null; email: string | null; phone: string | null };
    payment: { paymentId: string; status: string } | null;
    orderItems: Array<{
      price: number;
      product: {
        name: string;
        seller: { id: string; name: string | null; email: string | null; phone: string | null; fundAccountId: string | null };
      };
    }>;
    statusHistory: Array<{ id: string; fromStatus: string | null; toStatus: string; note: string | null; createdAt: string }>;
  };
};

type FilterTab = "ALL" | DisputeStatus;

export default function AdminPage() {
  const [authorized, setAuthorized] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [initialLoading, setInitialLoading] = useState(true);

  const [disputes, setDisputes] = useState<DisputeListItem[]>([]);
  const [stats, setStats] = useState({ activeDisputes: 0, resolvedThisWeek: 0, volumeThisWeek: 0 });
  const [selectedId, setSelectedId] = useState("");
  const [detail, setDetail] = useState<DisputeDetail | null>(null);
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [messageSubject, setMessageSubject] = useState("Admin clarification requested");
  const [messageRecipient, setMessageRecipient] = useState<"BUYER" | "SELLER" | "BOTH">("BOTH");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTab, setFilterTab] = useState<FilterTab>("ALL");
  const [sortNewestFirst, setSortNewestFirst] = useState(true);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDecision, setPendingDecision] = useState<DecisionType | null>(null);

  const fetchDisputes = useCallback(async () => {
    const res = await axios.get("/api/admin/disputes");
    const list: DisputeListItem[] = res.data.disputes || [];
    setDisputes(list);
    setStats(res.data.stats);
    setSelectedId((prev) => {
      if (prev && list.some((d) => d.id === prev)) return prev;
      return list[0]?.id ?? "";
    });
  }, []);

  const fetchDetail = useCallback(async (id: string) => {
    const res = await axios.get(`/api/admin/disputes/${id}`);
    setDetail(res.data);
    setReason(res.data.adminDecisionReason || "");
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await fetchDisputes();
        if (!cancelled) setAuthorized(true);
      } catch {
        if (!cancelled) setAuthorized(false);
      } finally {
        if (!cancelled) setInitialLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchDisputes]);

  useEffect(() => {
    if (selectedId && authorized) {
      fetchDetail(selectedId).catch(() => null);
    }
  }, [selectedId, authorized, fetchDetail]);

  const selected = useMemo(() => disputes.find((d) => d.id === selectedId) || null, [disputes, selectedId]);

  const filteredDisputes = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    let list = disputes.filter((d) => {
      if (filterTab !== "ALL" && d.status !== filterTab) return false;
      if (!query) return true;
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
    list = [...list].sort((a, b) => {
      const ta = new Date(a.openedAt).getTime();
      const tb = new Date(b.openedAt).getTime();
      return sortNewestFirst ? tb - ta : ta - tb;
    });
    return list;
  }, [disputes, searchTerm, filterTab, sortNewestFirst]);

  const sellerNetPayout = useMemo(() => {
    if (!detail) return 0;
    const gross = detail.order.orderItems.reduce((s, i) => s + i.price, 0);
    return Math.max(0, gross - (detail.order.platformFeeSeller || 0));
  }, [detail]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchDisputes();
      if (selectedId) await fetchDetail(selectedId);
      toast.success("Refreshed");
    } catch {
      toast.error("Could not refresh");
    } finally {
      setRefreshing(false);
    }
  };

  const handleLogin = async () => {
    setLoginError("");
    setLoading(true);
    try {
      await axios.post("/api/admin/login", { username, password });
      setAuthorized(true);
      await fetchDisputes();
      toast.success("Signed in");
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
    setSelectedId("");
    toast.message("Signed out");
  };

  const copyText = async (label: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied`);
    } catch {
      toast.error("Could not copy");
    }
  };

  const setStatus = async (status: DisputeStatus) => {
    if (!detail) return;
    setLoading(true);
    try {
      await axios.post(`/api/admin/disputes/${detail.id}/status`, { status });
      await fetchDisputes();
      await fetchDetail(detail.id);
      toast.success(`Status set to ${status.replace("_", " ")}`);
    } catch (error: unknown) {
      const msg =
        axios.isAxiosError(error) ? error.response?.data?.message : undefined;
      toast.error(msg || "Could not update status");
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!detail || !message.trim()) return;
    setLoading(true);
    try {
      await axios.post(`/api/admin/disputes/${detail.id}/messages`, {
        content: message.trim(),
        recipient: messageRecipient,
        subject: messageSubject.trim() || "Admin clarification requested",
      });
      setMessage("");
      await fetchDetail(detail.id);
      await fetchDisputes();
      toast.success("Notification sent");
    } catch (error: unknown) {
      const msg =
        axios.isAxiosError(error) ? error.response?.data?.message : undefined;
      toast.error(msg || "Could not send message");
    } finally {
      setLoading(false);
    }
  };

  const openDecisionConfirm = (decisionType: DecisionType) => {
    if (!detail) return;
    if (reason.trim().length < 10) {
      toast.error("Decision reason must be at least 10 characters.");
      return;
    }
    if (decisionType === "REFUND" && !detail.order.payment?.paymentId) {
      toast.error("No captured payment on file — refund cannot run.");
      return;
    }
    if (decisionType === "CREDIT" && !detail.order.orderItems[0]?.product.seller.fundAccountId) {
      toast.error("Seller has no payout account configured — credit cannot run.");
      return;
    }
    setPendingDecision(decisionType);
    setConfirmOpen(true);
  };

  const executeDecision = async () => {
    if (!detail || !pendingDecision) return;
    setLoading(true);
    try {
      await axios.post(`/api/admin/disputes/${detail.id}/decision`, {
        decisionType: pendingDecision,
        reason: reason.trim(),
      });
      await fetchDisputes();
      await fetchDetail(detail.id);
      toast.success("Decision executed");
      setConfirmOpen(false);
      setPendingDecision(null);
    } catch (error: unknown) {
      const msg =
        axios.isAxiosError(error) ? error.response?.data?.message : undefined;
      toast.error(msg || "Decision failed");
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
    if (status === "ACTIVE") return "bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900";
    if (status === "UNDER_REVIEW") return "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-900";
    return "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-900";
  };

  const decisionLocked =
    !!detail &&
    (detail.isLocked || detail.status === "RESOLVED" || !!detail.decisionType);

  if (initialLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6">
        <div className="mb-8 flex flex-col items-center gap-2 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <ShieldCheck className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Vault Admin</h1>
          <p className="max-w-sm text-sm text-muted-foreground">
            Dispute operations console. Sign in with credentials from your environment.
          </p>
        </div>
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
            <CardDescription>Username and password from `.env`</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="admin-user">Username</Label>
              <Input id="admin-user" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-pass">Password</Label>
              <Input id="admin-pass" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            {loginError ? <p className="text-sm text-destructive">{loginError}</p> : null}
            <Button className="w-full" onClick={handleLogin} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Continue
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-4 px-4 py-3 md:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Operations</p>
              <h1 className="text-lg font-semibold leading-tight">Dispute resolution</h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] space-y-6 px-4 py-6 md:px-8 md:py-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card className="border-primary/20 shadow-sm">
            <CardHeader className="pb-2">
              <CardDescription>Needs attention</CardDescription>
              <CardTitle className="text-3xl tabular-nums">{stats.activeDisputes}</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">Active + under review</CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardDescription>Resolved this week</CardDescription>
              <CardTitle className="text-3xl tabular-nums">{stats.resolvedThisWeek}</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">Week starts Monday (server TZ)</CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardDescription>Disputed volume (week)</CardDescription>
              <CardTitle className="text-3xl tabular-nums">₹{stats.volumeThisWeek.toFixed(2)}</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">Order totals for disputes opened this week (since Monday)</CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <Card className="xl:col-span-4">
            <CardHeader className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle>Queue</CardTitle>
                  <CardDescription>{filteredDisputes.length} shown · {disputes.length} total</CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
                  onClick={() => setSortNewestFirst((v) => !v)}
                  title={sortNewestFirst ? "Oldest first" : "Newest first"}
                >
                  {sortNewestFirst ? <ArrowDownAZ className="h-4 w-4" /> : <ArrowUpAZ className="h-4 w-4" />}
                </Button>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input className="pl-9" placeholder="Search ID, product, buyer, seller…" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
              <div className="flex flex-wrap gap-2">
                {(["ALL", "ACTIVE", "UNDER_REVIEW", "RESOLVED"] as const).map((tab) => (
                  <Button
                    key={tab}
                    size="sm"
                    variant={filterTab === tab ? "default" : "outline"}
                    className="rounded-full"
                    onClick={() => setFilterTab(tab)}
                  >
                    {tab === "ALL" ? "All" : tab.replace("_", " ")}
                  </Button>
                ))}
              </div>
            </CardHeader>
            <Separator />
            <CardContent className="p-0">
              <ScrollArea className="h-[min(72vh,640px)]">
                <div className="space-y-2 p-4">
                  {filteredDisputes.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setSelectedId(d.id)}
                      className={`w-full rounded-xl border p-3 text-left transition-all hover:bg-accent/50 ${
                        selected?.id === d.id ? "border-primary bg-accent/30 shadow-sm" : "border-border bg-card"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="line-clamp-2 font-medium leading-snug">{d.order.orderItems[0]?.product.name || "Dispute"}</p>
                        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusPillClass(d.status)}`}>
                          {d.status.replace("_", " ")}
                        </span>
                      </div>
                      <p className="mt-1 font-mono text-[11px] text-muted-foreground">{d.transactionId.slice(0, 13)}…</p>
                      <p className={`mt-1 text-xs font-medium ${getAgeColor(d.openedAt)}`}>
                        Opened {formatDistanceToNow(new Date(d.openedAt), { addSuffix: true })}
                      </p>
                    </button>
                  ))}
                  {!filteredDisputes.length ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">Nothing matches this filter.</p>
                  ) : null}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <Card className="shadow-sm xl:col-span-8">
            <CardHeader>
              <CardTitle>Case file</CardTitle>
              <CardDescription>Single-screen review: evidence, timeline, outreach, decision.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {!detail ? (
                <p className="text-sm text-muted-foreground">Select a dispute from the queue.</p>
              ) : (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusPillClass(detail.status)}`}>
                        {detail.status.replace("_", " ")}
                      </span>
                      <span className="rounded-md border bg-muted px-2 py-1 font-mono text-xs">{detail.order.status.replace(/_/g, " ")}</span>
                      {detail.decisionType ? (
                        <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-100">
                          Decision: {detail.decisionType}
                        </span>
                      ) : null}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => copyText("Dispute ID", detail.id)}>
                        <Copy className="mr-2 h-3.5 w-3.5" />
                        Dispute ID
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => copyText("Order ID", detail.transactionId)}>
                        <Copy className="mr-2 h-3.5 w-3.5" />
                        Order ID
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <Card className="bg-muted/40">
                      <CardHeader className="pb-2">
                        <CardDescription>Buyer</CardDescription>
                        <CardTitle className="text-base">{detail.order.buyer.name || "—"}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-1 text-xs text-muted-foreground">
                        <p>{detail.order.buyer.email || "No email"}</p>
                        <p>{detail.order.buyer.phone || ""}</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-muted/40">
                      <CardHeader className="pb-2">
                        <CardDescription>Seller</CardDescription>
                        <CardTitle className="text-base">{detail.order.orderItems[0]?.product.seller.name || "—"}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-1 text-xs text-muted-foreground">
                        <p>{detail.order.orderItems[0]?.product.seller.email || "No email"}</p>
                        <p>{detail.order.orderItems[0]?.product.seller.phone || ""}</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-muted/40">
                      <CardHeader className="pb-2">
                        <CardDescription>Amounts</CardDescription>
                        <CardTitle className="text-base tabular-nums">₹{detail.order.totalAmount.toFixed(2)}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-1 text-xs text-muted-foreground">
                        <p>Buyer-facing total (refund baseline)</p>
                        <p className="tabular-nums">Seller payout (credit): ₹{sellerNetPayout.toFixed(2)} net</p>
                        <p className="tabular-nums">Payment: {detail.order.payment?.paymentId ? "Captured" : "Missing"}</p>
                      </CardContent>
                    </Card>
                  </div>

                  <div>
                    <Label className="text-xs uppercase tracking-wide text-muted-foreground">Buyer stated reason</Label>
                    <p className="mt-2 rounded-xl border bg-muted/30 p-4 text-sm leading-relaxed">{detail.buyerReason}</p>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Buyer counter-evidence</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {detail.buyerEvidenceUrl ? (
                          <a className="text-sm font-medium text-primary underline-offset-4 hover:underline" href={detail.buyerEvidenceUrl} target="_blank" rel="noreferrer">
                            Open file / link
                          </a>
                        ) : (
                          <p className="text-sm text-muted-foreground">Not provided</p>
                        )}
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Seller recording</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {detail.sellerEvidenceUrl ? (
                          <video controls className="max-h-56 w-full rounded-lg border bg-black" src={detail.sellerEvidenceUrl} />
                        ) : (
                          <p className="text-sm text-muted-foreground">Not provided</p>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  <Separator />

                  <div>
                    <Label className="text-xs uppercase tracking-wide text-muted-foreground">Workflow</Label>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" disabled={decisionLocked || loading} onClick={() => setStatus("ACTIVE")}>
                        Mark active
                      </Button>
                      <Button variant="outline" size="sm" disabled={decisionLocked || loading} onClick={() => setStatus("UNDER_REVIEW")}>
                        Under review
                      </Button>
                      <p className="w-full text-xs text-muted-foreground">Resolved locks automatically after REFUND or CREDIT.</p>
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs uppercase tracking-wide text-muted-foreground">Order timeline</Label>
                    <ScrollArea className="mt-2 h-52 rounded-xl border">
                      <div className="space-y-3 p-4">
                        {detail.order.statusHistory.map((s) => (
                          <div key={s.id} className="border-l-2 border-primary/30 pl-3">
                            <p className="text-sm font-semibold">{s.toStatus.replace(/_/g, " ")}</p>
                            <p className="text-xs text-muted-foreground">{new Date(s.createdAt).toLocaleString()}</p>
                            {s.note ? <p className="mt-1 text-xs text-muted-foreground">{s.note}</p> : null}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>

                  <div>
                    <Label className="text-xs uppercase tracking-wide text-muted-foreground">Thread & notifications</Label>
                    <ScrollArea className="mt-2 h-36 rounded-xl border bg-muted/20">
                      <div className="space-y-2 p-4">
                        {(detail.messages || []).length === 0 ? (
                          <p className="text-sm text-muted-foreground">No messages yet.</p>
                        ) : (
                          (detail.messages || []).map((m) => (
                            <div key={m.id} className="rounded-lg bg-background p-2 text-sm shadow-sm">
                              <span className="font-semibold">{m.sender}</span>
                              <span className="text-muted-foreground"> · {new Date(m.createdAt).toLocaleString()}</span>
                              <p className="mt-1 whitespace-pre-wrap">{m.content}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </ScrollArea>
                    <div className="mt-3 grid gap-2 md:grid-cols-3">
                      <Input value={messageSubject} onChange={(e) => setMessageSubject(e.target.value)} placeholder="Subject line" disabled={decisionLocked} />
                      <select
                        value={messageRecipient}
                        onChange={(e) => setMessageRecipient(e.target.value as "BUYER" | "SELLER" | "BOTH")}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                        disabled={decisionLocked}
                      >
                        <option value="BOTH">Notify buyer & seller</option>
                        <option value="BUYER">Buyer only</option>
                        <option value="SELLER">Seller only</option>
                      </select>
                      <Button className="w-full" onClick={sendMessage} disabled={decisionLocked || loading || !message.trim()}>
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Send
                      </Button>
                    </div>
                    <Textarea className="mt-2 min-h-[88px]" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Clarification or instructions (creates in-app + email/SMS when configured)" disabled={decisionLocked} />
                  </div>

                  <Separator />

                  <div className="rounded-xl border border-amber-200/80 bg-amber-50/50 p-4 dark:border-amber-900 dark:bg-amber-950/20">
                    <div className="flex gap-2">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                      <div className="space-y-1">
                        <p className="text-sm font-medium">Irreversible actions</p>
                        <p className="text-xs text-muted-foreground">
                          Refund uses captured Razorpay payment; credit pays seller net (ticket total minus seller fee). Both parties are notified together after execution.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="decision-reason" className="text-xs uppercase tracking-wide text-muted-foreground">
                      Written decision (min 10 characters)
                    </Label>
                    <Textarea id="decision-reason" className="mt-2 min-h-[100px]" value={reason} onChange={(e) => setReason(e.target.value)} disabled={decisionLocked} />
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button variant="destructive" disabled={loading || decisionLocked || reason.trim().length < 10 || !!detail.decisionType} onClick={() => openDecisionConfirm("REFUND")}>
                        Refund buyer
                      </Button>
                      <Button disabled={loading || decisionLocked || reason.trim().length < 10 || !!detail.decisionType} onClick={() => openDecisionConfirm("CREDIT")}>
                        Credit seller
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs uppercase tracking-wide text-muted-foreground">Automated notification log</Label>
                    <ScrollArea className="mt-2 h-44 rounded-xl border">
                      <div className="space-y-2 p-4">
                        {(detail.notificationsLog || []).length === 0 ? (
                          <p className="text-sm text-muted-foreground">No automated sends logged yet.</p>
                        ) : (
                          (detail.notificationsLog || []).map((n) => (
                            <div key={n.id} className="text-sm">
                              <span className="text-muted-foreground">{new Date(n.createdAt).toLocaleString()}</span>
                              <span className="font-medium"> — {n.title}</span>
                              <p className="text-muted-foreground">{n.message}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </ScrollArea>
                  </div>

                  {detail.decidedBy ? (
                    <p className="text-xs text-muted-foreground">
                      Last decision by <span className="font-medium">{detail.decidedBy}</span>
                      {detail.decidedAt ? ` · ${new Date(detail.decidedAt).toLocaleString()}` : ""}
                    </p>
                  ) : null}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <Dialog
        open={confirmOpen}
        onOpenChange={(open) => {
          if (!loading) {
            setConfirmOpen(open);
            if (!open) setPendingDecision(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{pendingDecision === "REFUND" ? "Confirm refund" : "Confirm seller payout"}</DialogTitle>
            <DialogDescription>
              {pendingDecision === "REFUND"
                ? `Refund ₹${detail?.order.totalAmount.toFixed(2)} to the buyer's original payment method. This cannot be undone.`
                : `Pay ₹${sellerNetPayout.toFixed(2)} (net after seller fee) to the seller's linked account. This cannot be undone.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" disabled={loading} onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button variant={pendingDecision === "REFUND" ? "destructive" : "default"} disabled={loading} onClick={executeDecision}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
