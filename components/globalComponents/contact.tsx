"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Mail, Linkedin, Instagram } from "lucide-react";
import Link from "next/link";

const ContactSection = () => {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <footer className="w-full bg-black text-white py-10 px-6 md:px-16" id="contact">
      <div className="max-w-6xl mx-auto flex flex-col gap-10 md:flex-row justify-between">

        {/* Logo and Description */}
        <div className="flex-1 space-y-4 min-w-[250px]">
          <div className="flex items-center ">
            <img src="/logo.svg" alt="Vault Logo" className="h-12 w-12 pt-2 rounded" />
            <h2 className="text-xl font-semibold">Vault</h2>
          </div>
          <p className="text-gray-400 text-sm max-w-sm">A next-gen C2C marketplace built for trust.</p>

          <div className="flex items-center gap-2">
            <Mail size={18} className="text-gray-300" />
            <a href="mailto:support@vault.org.in" className="text-gray-300 hover:underline text-sm">
              support@vault.org.in
            </a>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-green-500 rounded-full"></span>
            <span className="text-xs text-blue-400 bg-blue-900 px-2 py-1 rounded-md">
              All Systems Operational
            </span>
          </div>
        </div>

        {/* Social & Legal */}
        <div className="flex-1 min-w-[250px] space-y-4">
          <h3 className="text-gray-400 font-semibold">Social Handles</h3>
          <div className="flex items-center gap-4">
            <Link href="https://www.linkedin.com/company/vault-in/" className="rounded-lg p-2 hover:bg-white/10 transition">
              <Linkedin size={20} />
            </Link>
            <Link href="https://www.instagram.com/vault_ltd?igsh=MXI3ZzdwOGZtaGhlNA==" className="rounded-lg p-2 hover:bg-white/10 transition">
              <Instagram size={20} />
            </Link>
          </div>

          <div className="text-sm text-gray-400 space-y-1 pt-4">
            <p>© 2017–2025 Vault</p>
            <p className="space-x-2">
              <a href="/terms" className="hover:underline">Terms of use</a>
              <span>·</span>
              <a href="/privacy" className="hover:underline">Privacy policy</a>
              <span>·</span>
              <a href="/cancellation-policy" className="hover:underline">Cancellation policy</a>
            </p>
          </div>

          

        </div>
        
      </div>
    </footer>
  );
};

export default ContactSection;
