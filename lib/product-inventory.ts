import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { ACTIVE_LISTING_ORDER_STATUSES, PAYMENT_PENDING_LOCK_MINUTES } from "@/lib/order-availability";

/**
 * Inventory model for a listing (`Products` row):
 *
 * - `ticketQuantity` is the number of tickets the seller still has on the
 *   listing. It goes down when an order completes (see
 *   `decrementProductInventory`) or when the seller removes unsold tickets.
 * - A ticket is "reserved" while an order for it is active: paid and in
 *   transfer, disputed, or awaiting payment for less than
 *   PAYMENT_PENDING_LOCK_MINUTES.
 * - A ticket is "available" when it is on the listing and not reserved.
 *   Only available tickets can be bought or removed by the seller.
 * - `isSold` is true only when the last ticket was sold. A listing whose
 *   remaining tickets were removed by the seller has `ticketQuantity = 0`
 *   and `isSold = false`.
 */

/**
 * SQL expression counting the active orders that currently reserve a
 * ticket on the listing identified by `productIdColumn`.
 */
export function reservedTicketCountSql(productIdColumn: Prisma.Sql) {
  return Prisma.sql`(
    SELECT COUNT(*)::int
    FROM "OrderItem" oi
    JOIN "Order" o ON o."id" = oi."orderId"
    WHERE oi."productId" = ${productIdColumn}
      AND o."status" IN (${Prisma.join(
        ACTIVE_LISTING_ORDER_STATUSES.map((status) => Prisma.sql`${status}::"OrderStatus"`)
      )})
      AND (
        o."status" <> ${"PAYMENT_PENDING"}::"OrderStatus"
        OR o."createdAt" >= NOW() - (${PAYMENT_PENDING_LOCK_MINUTES} * INTERVAL '1 minute')
      )
  )`;
}

/**
 * SQL condition that is false once a listing's event date (stored as
 * YYYY-MM-DD in `estimatedTime`) is before today in India. Older rows with a
 * free-text date are left alone because their date can't be parsed.
 */
const ISO_DATE_PATTERN = "^[0-9]{4}-[0-9]{2}-[0-9]{2}$";

export function eventNotPastSql(tableAlias: string) {
  const column = Prisma.raw(`${tableAlias}."estimatedTime"`);
  // YYYY-MM-DD strings sort chronologically, so compare them as text. This
  // avoids casting, which would throw on a malformed value.
  return Prisma.sql`(
    CASE
      WHEN ${column} ~ ${ISO_DATE_PATTERN} THEN ${column} >= ${todayInIndia()}
      ELSE TRUE
    END
  )`;
}

/** Today's date in India as YYYY-MM-DD. */
export function todayInIndia() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
}

/** SQL expression counting completed sales for a listing. */
export function soldTicketCountSql(productIdColumn: Prisma.Sql) {
  return Prisma.sql`(
    SELECT COUNT(*)::int
    FROM "OrderItem" oi
    JOIN "Order" o ON o."id" = oi."orderId"
    WHERE oi."productId" = ${productIdColumn}
      AND o."status" = ${"COMPLETE"}::"OrderStatus"
  )`;
}

export type ListingStatus = "ON_SALE" | "RESERVED" | "SOLD_OUT" | "DELISTED";

export type ListingInventory = {
  remaining: number;
  reserved: number;
  available: number;
  sold: number;
  status: ListingStatus;
};

export function describeInventory({
  ticketQuantity,
  reserved,
  sold,
  isSold,
}: {
  ticketQuantity: number;
  reserved: number;
  sold: number;
  isSold: boolean;
}): ListingInventory {
  const remaining = Math.max(ticketQuantity, 0);
  const available = Math.max(remaining - reserved, 0);

  let status: ListingStatus;
  if (available > 0) {
    status = "ON_SALE";
  } else if (reserved > 0) {
    status = "RESERVED";
  } else if (isSold) {
    status = "SOLD_OUT";
  } else {
    status = "DELISTED";
  }

  return { remaining, reserved, available, sold, status };
}

export class InventoryError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "InventoryError";
  }
}

export type DelistResult = {
  deleted: boolean;
  removed: number;
  remaining: number;
  reserved: number;
};

/**
 * Removes unsold, unreserved tickets from a seller's listing.
 *
 * Tickets that are part of an active order can never be removed; the seller
 * has to wait for that order to complete or be cancelled. When a listing
 * has never had any order and every ticket is removed, the listing is
 * deleted outright. Otherwise it is kept (its order history references it)
 * with the reduced ticket count.
 *
 * The listing row is locked for the whole operation, so a buyer checking
 * out at the same moment can't reserve a ticket that is being removed.
 */
export async function delistTickets({
  sellerId,
  productId,
  quantity,
}: {
  sellerId: string;
  productId: string;
  quantity: number | "ALL";
}): Promise<DelistResult> {
  if (quantity !== "ALL" && (!Number.isInteger(quantity) || quantity < 1)) {
    throw new InventoryError("Number of tickets to remove must be a whole number of at least 1", 400);
  }

  return prisma.$transaction(async (tx) => {
    const [listing] = await tx.$queryRaw<Array<{
      id: string;
      sellerId: string;
      ticketQuantity: number;
      reserved: number;
      hasOrderHistory: boolean;
    }>>(Prisma.sql`
      SELECT
        p."id",
        p."sellerId",
        p."ticketQuantity",
        ${reservedTicketCountSql(Prisma.raw(`p."id"`))} AS "reserved",
        EXISTS (SELECT 1 FROM "OrderItem" oi WHERE oi."productId" = p."id") AS "hasOrderHistory"
      FROM "Products" p
      WHERE p."id" = ${productId}
      FOR UPDATE
    `);

    if (!listing) {
      throw new InventoryError("Listing not found", 404);
    }

    if (listing.sellerId !== sellerId) {
      throw new InventoryError("You can only manage your own listings", 403);
    }

    const remaining = Math.max(listing.ticketQuantity, 0);
    const available = Math.max(remaining - listing.reserved, 0);

    if (available === 0) {
      throw new InventoryError(
        listing.reserved > 0
          ? `All ${listing.reserved} remaining ticket(s) are part of active orders and can't be removed until those orders finish.`
          : "There are no tickets left on this listing to remove.",
        409
      );
    }

    const toRemove = quantity === "ALL" ? available : quantity;

    if (toRemove > available) {
      throw new InventoryError(
        `Only ${available} ticket(s) can be removed. ${listing.reserved} ticket(s) are part of active orders and must stay listed.`,
        409
      );
    }

    if (!listing.hasOrderHistory && toRemove === remaining) {
      await tx.products.delete({ where: { id: productId } });
      return { deleted: true, removed: toRemove, remaining: 0, reserved: 0 };
    }

    await tx.$executeRaw(Prisma.sql`
      UPDATE "Products"
      SET "ticketQuantity" = "ticketQuantity" - ${toRemove},
          "updatedAt" = NOW()
      WHERE "id" = ${productId}
    `);

    return {
      deleted: false,
      removed: toRemove,
      remaining: remaining - toRemove,
      reserved: listing.reserved,
    };
  });
}
