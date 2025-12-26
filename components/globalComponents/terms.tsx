import React from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

const TermsAndConditions = () => {
  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Terms & Conditions</CardTitle>
          <CardDescription>Last updated: 7 April - 2025</CardDescription>
        </CardHeader>
        <CardContent className="leading-6">

          <p>Welcome to Vault, a platform owned and operated by S&A Associates ("we", "us", or "our"). [cite: 1, 2]</p>
          <p>By accessing or using our services through our website, mobile interface, or Chrome extension, you agree to these Terms and Conditions. [cite: 2]</p>

          <section className="mt-4">
            <h2 className="text-xl font-semibold mb-2">1. Eligibility</h2>
            <p>You must be at least 18 years old and reside in India to use Vault. [cite: 3] By creating an account via phone number or Google login, you confirm your eligibility. [cite: 4]</p>
          </section>

          <section className="mt-4">
            <h2 className="text-xl font-semibold mb-2">2. Platform Overview</h2>
            <p>Vault is a peer-to-peer (C2C) marketplace designed to facilitate secure commerce between users by leveraging:</p>
            <ul className="list-disc list-inside ml-5">
              <li>Escrow services (powered by RazorpayX) [cite: 5]</li>
              <li>AI-based dispute resolution recommendations</li>
              <li>In-app chat and listing infrastructure</li>
            </ul>
          </section>

          <section className="mt-4">
            <h2 className="text-xl font-semibold mb-2">3. Payments & Fees</h2>
            <p>We use RazorpayX Escrow to hold funds during a transaction until delivery is confirmed. [cite: 5, 6]</p>
            <p>A 5% transaction fee is charged to the seller only, automatically deducted before payout. [cite: 6]</p>
            <p>Buyers are not charged any platform fee. [cite: 6]</p>
            <p>All payments are processed via Razorpay and are subject to their respective terms. [cite: 7]</p>
          </section>

          <section className="mt-4">
            <h2 className="text-xl font-semibold mb-2">4. Dispute Resolution</h2>
            <ul className="list-disc list-inside ml-5">
              <li>Disputes are reviewed by Vault's internal team using AI-generated insights based on transaction history and chat logs. [cite: 8]</li>
              <li>Final resolution decisions are made by human moderators, not AI. [cite: 9]</li>
              <li>Refunds (including the 100% fraud protection guarantee) are issued post-review at Vault's sole discretion. [cite: 10]</li>
            </ul>
          </section>

          <section className="mt-4">
            <h2 className="text-xl font-semibold mb-2">5. User Conduct</h2>
            <p>By using Vault, you agree to:</p>
            <ul className="list-disc list-inside ml-5">
              <li>Provide accurate and complete information [cite: 11]</li>
              <li>Not engage in fraudulent, abusive, or misleading activity [cite: 11]</li>
              <li>Only list items/services that comply with Indian law [cite: 11]</li>
              <li>Cooperate in good faith during disputes [cite: 11]</li>
            </ul>
            <p>Vault reserves the right to suspend or ban users who violate these terms. [cite: 11]</p>
          </section>

          <section className="mt-4">
            <h2 className="text-xl font-semibold mb-2">6. Liability & Indemnity</h2>
            <p>Vault acts only as a facilitator. We are not responsible for:</p>
            <ul className="list-disc list-inside ml-5">
              <li>The accuracy of user listings [cite: 12]</li>
              <li>Delivery or quality of goods [cite: 12]</li>
              <li>Data collected by third-party services such as Razorpay or OpenAI (ChatGPT) [cite: 12]</li>
            </ul>
            <p>By using Vault, you indemnify us from any legal claims arising out of user misconduct or third-party failures. [cite: 12]</p>
          </section>

          <section className="mt-4">
            <h2 className="text-xl font-semibold mb-2">7. Termination</h2>
            <p>Users may delete their account at any time. [cite: 13] Vault reserves the right to suspend or terminate access for any user violating these terms or engaging in fraudulent activity. [cite: 13]</p>
          </section>

          <section className="mt-4">
            <h2 className="text-xl font-semibold mb-2">8. Changes to Terms</h2>
            <p>We may modify these Terms at any time. [cite: 14, 15] Continued use of the platform constitutes acceptance of any revised terms. [cite: 15]</p>
          </section>

        </CardContent>
      </Card>
    </div>
  );
};

export default TermsAndConditions;