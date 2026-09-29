import nodemailer, { type Transporter } from "nodemailer";

const SMTP_PORT = Number(process.env.SMTP_PORT ?? 587);
const FROM_ADDRESS = process.env.SMTP_FROM_EMAIL ?? "support@vaultpay.co.in";

let transporter: Transporter | null = null;

function getTransporter() {
  if (!process.env.SMTP_HOST) {
    return null;
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465, // true for 465 (SSL), false for 587 (STARTTLS)
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  return transporter;
}

/**
 * Escapes text that users typed (names, reasons, listing titles) before it
 * is interpolated into an HTML email, so it can't inject links or markup.
 */
export function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Address that receives operational alerts, from the ADMIN_EMAIL setting. */
export function getAdminEmail() {
  return process.env.ADMIN_EMAIL?.trim() || null;
}

export const sendMail = async ({
  to,
  subject,
  html,
}: {
  to: string | null | undefined;
  subject: string;
  html: string;
}) => {
  if (!to) {
    return null;
  }

  const mailer = getTransporter();
  if (!mailer) {
    console.warn(`SMTP is not configured; email "${subject}" was not sent.`);
    return null;
  }

  try {
    return await mailer.sendMail({
      from: `"Vault" <${FROM_ADDRESS}>`,
      to,
      subject,
      html,
    });
  } catch (error) {
    console.error(`Error sending email "${subject}":`, error);
    return null;
  }
};

/** Sends an operational alert to ADMIN_EMAIL, or logs a warning if it isn't set. */
export const sendAdminMail = async ({ subject, html }: { subject: string; html: string }) => {
  const adminEmail = getAdminEmail();
  if (!adminEmail) {
    console.warn(`ADMIN_EMAIL is not configured; admin alert "${subject}" was not sent.`);
    return null;
  }
  return sendMail({ to: adminEmail, subject, html });
};
