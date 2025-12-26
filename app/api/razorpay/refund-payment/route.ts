import { NextApiRequest, NextApiResponse } from "next";
import Razorpay from "razorpay";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  try {
    const { paymentId, amount } = req.body;
    if (!paymentId || !amount) return res.status(400).json({ error: "Missing parameters" });

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAYX_KEY_ID!,
      key_secret: process.env.RAZORPAYX_KEY_SECRET!,
    });

    const refund = await razorpay.payments.refund(paymentId, { amount: amount * 100 });
    res.status(200).json(refund);
  } catch (error: any) {
    console.error("Refund error:", error);
    res.status(500).json({ error: error.message });
  }
}
