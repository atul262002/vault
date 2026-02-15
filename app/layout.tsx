"use client"
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "@/components/ui/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import { UserContextProvider } from "@/contexts/userContext";
// import Chatbot from "@/components/chatbotComponents/chat-bot";
import DraggableChatWidget from "@/components/freeChatBot/draggable-chat-widget";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const metadata: Metadata = {
  title: "Vault",
  description: "Vault keeps your payment safe whether you are shopping online or buying from someone from OLX, Facebook, Instagram, or elsewhere",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body className={`${geistSans.variable} ${geistMono.variable} antialiased w-full`}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <UserContextProvider>
              {children}
            </UserContextProvider>
            <Toaster />
            {/* <Chatbot /> */}
            <DraggableChatWidget />
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
