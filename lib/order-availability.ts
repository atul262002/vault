export const ACTIVE_LISTING_ORDER_STATUSES = [
  "PAYMENT_PENDING",
  "FUNDS_HELD",
  "TRANSFER_PENDING",
  "TRANSFER_IN_PROGRESS",
  "AWAITING_CONFIRMATION",
  "DISPUTED",
] as const;

export const PAYMENT_PENDING_LOCK_MINUTES = 15;

export function isListingLockedStatus(status: string) {
  return ACTIVE_LISTING_ORDER_STATUSES.includes(
    status as (typeof ACTIVE_LISTING_ORDER_STATUSES)[number]
  );
}
