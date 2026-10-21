import { prisma } from "@/lib/db";

// Reminder schedules, in minutes before each deadline.
export const SELLER_TRANSFER_REMINDERS = [20, 10, 5];
export const SELLER_EVIDENCE_REMINDERS = [10, 5, 1];
export const BUYER_CONFIRM_REMINDERS = [5, 3];

/**
 * Decides whether a reminder is due and claims it atomically.
 *
 * Reminders used to fire only when a cron run landed on exactly the right
 * minute, so a late or slow run (e.g. waiting on SMTP/Twilio) silently
 * skipped them. Now a reminder is due once its moment has passed and no
 * reminder has been sent since that moment. The claim is a conditional
 * update, so overlapping cron runs can't send the same reminder twice.
 * If several are overdue (cron was down), only the most urgent one is sent.
 *
 * Returns the minutes actually left if this run should send, else null.
 */
export async function claimDueReminder({
  orderId,
  field,
  deadline,
  schedule,
  now,
  dryRun,
}: {
  orderId: string;
  field: "lastSellerReminderSentAt" | "lastBuyerReminderSentAt";
  deadline: Date;
  schedule: number[];
  now: Date;
  dryRun: boolean;
}): Promise<number | null> {
  const msLeft = deadline.getTime() - now.getTime();
  if (msLeft <= 0) return null;

  const passed = schedule.filter((minutes) => msLeft <= minutes * 60 * 1000);
  if (passed.length === 0) return null;

  const dueAt = new Date(deadline.getTime() - Math.min(...passed) * 60 * 1000);
  const minutesLeft = Math.max(1, Math.ceil(msLeft / 60000));
  if (dryRun) return minutesLeft;

  const claimed = await prisma.order.updateMany({
    where: {
      id: orderId,
      OR: [{ [field]: null }, { [field]: { lt: dueAt } }],
    },
    data: { [field]: now },
  });

  return claimed.count === 1 ? minutesLeft : null;
}
