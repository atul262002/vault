import nodemailer from 'nodemailer';

const SMTP_PORT = Number(process.env.SMTP_PORT ?? 587);
const FROM_ADDRESS = process.env.SMTP_FROM_EMAIL ?? 'support@vaultpay.co.in';

export const sendMail = async ({
    to,
    subject,
    html,
}: {
    to: string;
    subject: string;
    html: string;
}) => {
    try {
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: SMTP_PORT,
            secure: SMTP_PORT === 465, // true for port 465 (SSL), false for 587 (TLS/STARTTLS)
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });

        const info = await transporter.sendMail({
            from: `"Vault" <${FROM_ADDRESS}>`,
            to, // list of receivers
            subject, // Subject line
            html, // html body
        });

        console.log("Message sent: %s", info.messageId);
        return info;
    } catch (error) {
        console.error("Error sending email:", error);
        return null;
    }
};
