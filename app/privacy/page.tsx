import React from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

const PrivacyPolicy = () => {
  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Privacy Policy</CardTitle>
          <CardDescription>Last updated: 7 April - 2025</CardDescription>
        </CardHeader>
        <CardContent className="leading-6">

          <p>This Privacy Policy explains how Vault (S&A Associates) collects, uses, and protects your personal data in compliance with applicable Indian privacy laws.</p>

          <section className="mt-4">
            <h2 className="text-xl font-semibold mb-2">1. What We Collect</h2>
            <p>When you use Vault, we collect:</p>
            <ul className="list-disc list-inside ml-5">
              <li>Name, phone number, email address (via Google or phone login)</li>
              <li>Listing and transaction details</li>
              <li>In-app chat messages</li>
              <li>Location (if shared by user)</li>
              <li>Device and usage data</li>
            </ul>
          </section>

          <section className="mt-4">
            <h2 className="text-xl font-semibold mb-2">2. How We Use Your Data</h2>
            <p>To facilitate escrow-based transactions and payouts</p>
            <p>To recommend and resolve disputes using AI</p>
            <p>To detect and prevent fraud</p>
            <p>To provide support and platform improvements</p>
          </section>

          <section className="mt-4">
            <h2 className="text-xl font-semibold mb-2">3. Data Retention</h2>
            <p>You may delete your account at any time</p>
            <p>Even after account deletion, we retain anonymized chat data for AI model training and product development</p>
            <p>Transactional records may be retained for legal and audit purposes</p>
          </section>

          <section className="mt-4">
            <h2 className="text-xl font-semibold mb-2">4. Third-Party Services</h2>
            <p>We integrate with third-party services, including:</p>
            <ul className="list-disc list-inside ml-5">
              <li>Razorpay & RazorpayX - Payment and escrow</li>
              <li>OpenAI (ChatGPT) - AI-based chat and dispute assistance</li>
              <li>Supabase - Backend infrastructure</li>
            </ul>
            <p>We do not control or assume responsibility for how these third parties handle your data. Please review their respective privacy policies.</p>
          </section>

          <section className="mt-4">
            <h2 className="text-xl font-semibold mb-2">5. Data Security</h2>
            <p>We use industry-standard security measures to protect your data.</p>
            <p>However, no method of transmission is 100% secure, and Vault is not liable for breaches beyond our control.</p>
          </section>

          <section className="mt-4">
            <h2 className="text-xl font-semibold mb-2">6. Your Rights</h2>
            <ul className="list-disc list-inside ml-5">
              <li>You may request account deletion at any time</li>
              <li>You may contact us to access or update your personal data</li>
              <li>You may request clarification regarding our data practices via email</li>
            </ul>
          </section>

          <section className="mt-4">
            <h2 className="text-xl font-semibold mb-2">7. Changes to this Policy</h2>
            <p>We may update this Privacy Policy periodically.</p>
            <p>Users will be notified via email or in-app message.</p>
          </section>

          <section className="mt-4">
            <h2 className="text-xl font-semibold mb-2">8. Contact Us</h2>
            <p>If you have questions, contact: support@vault.org.in</p>
          </section>

        </CardContent>
      </Card>
    </div>
  );
};

export default PrivacyPolicy;