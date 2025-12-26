"use client";

import React from "react";
import { InfiniteMovingCards } from "@/components/ui/infinite-moving-cards";

export function InfiniteMovingCardsDemo() {
  return (
    <div
      id="reviews"
      className="min-h-[40rem] sm:min-h-[50rem] md:min-h-[60rem] w-full rounded-md flex flex-col antialiased bg-white dark:bg-black dark:bg-grid-white/[0.05] items-center justify-center relative overflow-hidden px-4 sm:px-6"
    >
      <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold text-black dark:text-white drop-shadow-lg text-center mb-8">
        What Our Users Say
      </h1>
      <div className="w-full max-w-7xl">
        <InfiniteMovingCards
          items={testimonials}
          direction="right"
          speed="slow"
        />
      </div>
    </div>
  );
}

const testimonials = [
  {
    rating: 5,
    quote:
      "This is SO MUCH better than selling directly on Instagram – My sales have improved since I can offer flexible deals without worrying about scams, and my customers are thrilled!",
    name: "Karan Mehta",
    title: "Delhi",
  },
  {
    rating: 5,
    quote:
      "The seller never shipped, and Vault handled it without me having to chase anyone. 100% refund. No drama.",
    name: "Abhishek Rao",
    title: "Hyderabad",
  },
  {
    rating: 5,
    quote:
      "I almost got scammed by a fake seller on Instagram, but Vault held my money until delivery. Got a full refund when they ghosted. Genius product!",
    name: "Ananya R.",
    title: "Bangalore",
  },
  {
    rating: 4,
    quote:
      "Was skeptical at first, but the dispute resolution was fast and AI-backed. I got my refund within 2 days. Felt like someone actually had my back.",
    name: "Nidhi Agarwal",
    title: "Pune",
  },
  {
    rating: 4,
    quote:
      "What I love most about Vault is not having to deal with COD or flaky buyers anymore. Their payment system just works!",
    name: "Kabir Walia",
    title: "Mumbai",
  },
  {
    rating: 5,
    quote:
      "Love the clean interface and how it protects both sides. This is the future of buying and selling online.",
    name: "Aakash Jain",
    title: "Ahmedabad",
  },
];
