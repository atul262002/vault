-- One token per open Razorpay payment window, so closing one of several
-- windows for the same checkout doesn't release a ticket another window is paying for.
ALTER TABLE "Order" ADD COLUMN "checkoutTokens" TEXT[] DEFAULT ARRAY[]::TEXT[];
