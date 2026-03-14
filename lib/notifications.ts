import { sendMail } from "@/lib/mail";

type NotificationPayload = {
  email?: string | null;
  phone?: string | null;
  subject: string;
  html: string;
  smsText?: string;
};

export async function sendNotification({
  email,
  phone,
  subject,
  html,
  smsText,
}: NotificationPayload) {
  const tasks: Promise<unknown>[] = [];

  if (email) {
    tasks.push(sendMail({ to: email, subject, html }));
  }

  if (phone && smsText) {
    tasks.push(sendSms(phone, smsText));
  }

  await Promise.allSettled(tasks);
}

async function sendSms(phone: string, body: string) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    console.log(`SMS skipped for ${phone}: Twilio is not configured.`);
    return;
  }

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: phone,
        From: fromNumber,
        Body: body,
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to send SMS: ${response.status} ${errorText}`);
  }
}
