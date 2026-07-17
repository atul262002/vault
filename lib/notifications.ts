import { sendMail } from "@/lib/mail";

type NotificationPayload = {
  email?: string | null;
  phone?: string | null;
  whatsappNumber?: string | null;
  subject: string;
  html: string;
  smsText?: string;
};

type NotificationResult = {
  delivered: boolean;
  emailSent: boolean;
  smsSent: boolean;
  whatsappSent: boolean;
};

export async function sendNotification({
  email,
  phone,
  whatsappNumber,
  subject,
  html,
  smsText,
}: NotificationPayload): Promise<NotificationResult> {
  const tasks: Array<Promise<unknown>> = [];

  if (email) {
    tasks.push(sendMail({ to: email, subject, html }));
  }

  if (phone && smsText) {
    tasks.push(sendSms(phone, smsText));
  }

  if (whatsappNumber && smsText) {
    tasks.push(sendWhatsApp(whatsappNumber, smsText));
  }

  const settled = await Promise.allSettled(tasks);

  const emailResult = email ? settled.shift() : undefined;
  const smsResult = phone && smsText ? settled.shift() : undefined;
  const waResult = whatsappNumber && smsText ? settled.shift() : undefined;

  const emailSent =
    !email ||
    (emailResult?.status === "fulfilled" && emailResult.value !== null);
  const smsSent =
    !(phone && smsText) ||
    smsResult?.status === "fulfilled";
  const whatsappSent =
    !(whatsappNumber && smsText) ||
    waResult?.status === "fulfilled";

  return {
    delivered: emailSent || smsSent || whatsappSent,
    emailSent: Boolean(email && emailSent),
    smsSent: Boolean(phone && smsText && smsSent),
    whatsappSent: Boolean(whatsappNumber && smsText && whatsappSent),
  };
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

async function sendWhatsApp(whatsappNumber: string, body: string) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  // Twilio WhatsApp sender:
  //   Sandbox  → "whatsapp:+14155238886"  (add to .env as TWILIO_WHATSAPP_FROM)
  //   Production → your approved WhatsApp business number
  const fromNumber = process.env.TWILIO_WHATSAPP_FROM;

  if (!accountSid || !authToken || !fromNumber) {
    console.log(`WhatsApp skipped for ${whatsappNumber}: TWILIO_WHATSAPP_FROM is not configured.`);
    return;
  }

  // Normalise to E.164 and wrap in whatsapp: scheme
  const normalised = whatsappNumber.startsWith("+")
    ? whatsappNumber
    : `+91${whatsappNumber}`;
  const to = `whatsapp:${normalised}`;
  const from = fromNumber.startsWith("whatsapp:")
    ? fromNumber
    : `whatsapp:${fromNumber}`;

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: to,
        From: from,
        Body: body,
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to send WhatsApp: ${response.status} ${errorText}`);
  }
}
