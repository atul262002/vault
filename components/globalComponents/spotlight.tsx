"use client";
import React from "react";
import { Spotlight } from "@/components/ui/spotlight-new";

export function SpotlightNewDemo({children}:{children:React.ReactNode}) {
  return (
    <div className="h-[40rem] w-full rounded-md flex sm:items-center sm:justify-center md:items-center md:justify-center bg-black/[0.96] antialiased bg-grid-white/[0.02] relative overflow-hidden">
      <Spotlight />
      <div className="mx-auto relative z-10  w-full ">
        {children}
      </div>
    </div>
  );
}
