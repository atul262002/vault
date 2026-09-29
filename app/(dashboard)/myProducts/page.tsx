"use client";

import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { Loader2, MinusCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ListingStatus = "ON_SALE" | "RESERVED" | "SOLD_OUT" | "DELISTED";

type SellerListing = {
  id: string;
  listingId: string;
  name: string;
  imageUrl: string | null;
  image: string | null;
  price: number;
  refundPeriod: string;
  estimatedTime: string;
  description: string;
  inventory: {
    remaining: number;
    reserved: number;
    available: number;
    sold: number;
    status: ListingStatus;
  };
};

type PendingAction =
  | { kind: "remove"; listing: SellerListing; quantity: number }
  | { kind: "removeAll"; listing: SellerListing };

const STATUS_STYLES: Record<ListingStatus, { label: string; className: string }> = {
  ON_SALE: {
    label: "On sale",
    className: "bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-300",
  },
  RESERVED: {
    label: "All tickets in active orders",
    className: "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300",
  },
  SOLD_OUT: {
    label: "Sold out",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300",
  },
  DELISTED: {
    label: "Removed from sale",
    className: "bg-muted text-muted-foreground",
  },
};

function getErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message || fallback;
  }
  return fallback;
}

const MyProducts = () => {
  const [listings, setListings] = useState<SellerListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [removeCounts, setRemoveCounts] = useState<Record<string, number>>({});
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchListings = useCallback(async () => {
    try {
      setLoadError(null);
      const response = await axios.get("/api/product/my-products");
      setListings(response.data.result ?? []);
    } catch (error) {
      console.error("Error while fetching listings", error);
      setLoadError(getErrorMessage(error, "Could not load your listings. Please refresh."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  const confirmAction = async () => {
    if (!pendingAction) return;

    setSubmitting(true);
    try {
      const response =
        pendingAction.kind === "remove"
          ? await axios.post("/api/product/delist", {
              productId: pendingAction.listing.id,
              quantity: pendingAction.quantity,
            })
          : await axios.delete("/api/product/delete", {
              data: { productId: pendingAction.listing.id },
            });

      toast.success(response.data.message || "Listing updated");
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not update this listing"));
    } finally {
      setSubmitting(false);
      setPendingAction(null);
      // Always refresh: availability can change at any moment as buyers check out.
      await fetchListings();
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh] gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading your listings...
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">My Ticket Listings</h1>
      <p className="text-sm text-muted-foreground mb-6">
        You can remove tickets that no buyer has ordered yet. Tickets that are part of an active
        order stay listed until that order completes or is cancelled.
      </p>

      {loadError && (
        <div className="mb-6 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {loadError}
        </div>
      )}

      {listings.length === 0 && !loadError ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground text-lg">You haven&apos;t added any ticket listings yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {listings.map((listing) => {
            const { inventory } = listing;
            const status = STATUS_STYLES[inventory.status];
            const removeCount = Math.min(removeCounts[listing.id] ?? 1, Math.max(inventory.available, 1));
            const imageSrc = listing.imageUrl || listing.image;

            return (
              <div
                key={listing.id}
                className="flex flex-col bg-card text-card-foreground border border-border rounded-lg p-4 shadow-sm"
              >
                {imageSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imageSrc}
                    alt={listing.name}
                    className="w-full h-48 object-cover rounded-md mb-4"
                  />
                ) : (
                  <div className="w-full h-48 rounded-md mb-4 bg-muted" />
                )}

                <div className="flex items-center justify-between gap-2 mb-2">
                  <p className="text-xs text-muted-foreground font-mono">{listing.listingId}</p>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${status.className}`}>
                    {status.label}
                  </span>
                </div>

                <h3 className="text-xl font-semibold mb-1">{listing.name}</h3>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400 mb-1">
                  ₹{listing.price} <span className="text-sm font-normal text-muted-foreground">per ticket</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  {listing.estimatedTime} · {listing.refundPeriod}
                </p>

                <div className="grid grid-cols-3 gap-2 my-4 text-center">
                  <div className="rounded-md bg-muted px-2 py-2">
                    <p className="text-lg font-semibold">{inventory.available}</p>
                    <p className="text-xs text-muted-foreground">Available</p>
                  </div>
                  <div className="rounded-md bg-muted px-2 py-2">
                    <p className="text-lg font-semibold">{inventory.reserved}</p>
                    <p className="text-xs text-muted-foreground">In orders</p>
                  </div>
                  <div className="rounded-md bg-muted px-2 py-2">
                    <p className="text-lg font-semibold">{inventory.sold}</p>
                    <p className="text-xs text-muted-foreground">Sold</p>
                  </div>
                </div>

                <div className="mt-auto space-y-2">
                  {inventory.available > 1 && (
                    <div className="flex gap-2">
                      <select
                        aria-label="Number of tickets to remove"
                        value={removeCount}
                        onChange={(e) =>
                          setRemoveCounts((prev) => ({ ...prev, [listing.id]: Number(e.target.value) }))
                        }
                        className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                      >
                        {Array.from({ length: inventory.available }, (_, i) => i + 1).map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                      <Button
                        variant="outline"
                        className="flex-1 gap-2"
                        onClick={() => setPendingAction({ kind: "remove", listing, quantity: removeCount })}
                      >
                        <MinusCircle className="h-4 w-4" />
                        Remove {removeCount} ticket{removeCount > 1 ? "s" : ""}
                      </Button>
                    </div>
                  )}

                  {inventory.available > 0 ? (
                    <Button
                      variant="destructive"
                      className="w-full gap-2"
                      onClick={() => setPendingAction({ kind: "removeAll", listing })}
                    >
                      <Trash2 className="h-4 w-4" />
                      {inventory.reserved > 0 || inventory.sold > 0
                        ? `Remove all ${inventory.available} unsold ticket${inventory.available > 1 ? "s" : ""}`
                        : "Delete listing"}
                    </Button>
                  ) : inventory.reserved > 0 ? (
                    <p className="text-xs text-muted-foreground text-center">
                      Every remaining ticket is part of an active order and can&apos;t be removed right now.
                    </p>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={!!pendingAction} onOpenChange={(open) => !open && !submitting && setPendingAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {pendingAction?.kind === "remove" ? "Remove tickets?" : "Remove unsold tickets?"}
            </DialogTitle>
            <DialogDescription>
              {pendingAction?.kind === "remove"
                ? `${pendingAction.quantity} unsold ticket${pendingAction.quantity > 1 ? "s" : ""} will be taken off "${pendingAction.listing.name}". Buyers will no longer be able to purchase ${pendingAction.quantity > 1 ? "them" : "it"}.`
                : pendingAction
                  ? pendingAction.listing.inventory.reserved > 0
                    ? `All ${pendingAction.listing.inventory.available} unsold ticket(s) on "${pendingAction.listing.name}" will be removed. ${pendingAction.listing.inventory.reserved} ticket(s) in active orders stay listed until those orders finish.`
                    : `"${pendingAction.listing.name}" will be taken off sale. This can't be undone.`
                  : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" disabled={submitting} onClick={() => setPendingAction(null)}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={submitting} onClick={confirmAction}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MyProducts;
