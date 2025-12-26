import Link from "next/link";
import React from "react";
import { Button } from "../ui/button";
import { ArrowRight, Info } from "lucide-react";

const Title = () => {
    return (
        <div className="flex flex-col items-center gap-y-3 md:gap-y-4 justify-center text-center mx-auto px-4 md:px-8 lg:px-0 max-w-3xl py-12 sm:py-8">
            {/* Optional: Animated button on larger screens */}
            {/* <Link href={'/'} className="hidden md:block">
                <Button className="rounded-full flex items-center justify-center text-sm" variant={'secondary'}>Manage products end to end. <ArrowRight className="bg-muted-foreground rounded-full h-4 w-4" /> </Button>
            </Link> */}
            <h1 className="text-3xl md:text-5xl lg:text-7xl font-extrabold text-black dark:text-white drop-shadow-lg dark:drop-shadow-[0_4px_10px_rgba(255,255,255,0.3)] leading-tight">
                <span className="block md:inline">Designed for trust</span>
                <br className="hidden md:block" />
                <span className="block md:inline">Built to protect</span>
            </h1>
            <span className="text-base md:text-md mt-2 md:mt-3 text-primary font-medium">
                Vault keeps your payment safe whether you are shopping online or buying from someone from OLX, Facebook, Instagram, or elsewhere.
            </span>
            <span className="text-base md:text-2xl mt-2 md:mt-3 text-primary font-medium">
                100% Refund Guranteed in case of Fraud — <Link href={`https://forms.gle/wSNX5gEKr4YqiTHb6`} className="text-yellow-400 underline">Join the waitlist!</Link>
            </span>
            <Link href={'/dashboard'}>
                <Button className="p-3 md:p-4 text-base">Secure deals now</Button>
            </Link>
            <div className=" flex flex-col justify-center items-center">
            <span className="text-sm text-gray-400 mr-2">Powered by</span>
            <img
              src="/razorpay.svg"
              alt="Razorpay Logo"
              className="size-8 w-auto object-contain"
            />
          </div>
            {/* <span className="text-xs md:text-sm mt-1 flex items-center justify-center gap-x-2 text-muted-foreground">
                <Info className="h-3 w-3 md:h-4 md:w-4" />
                <span>No wallet required</span>
            </span> */}
            {/* <span className="pt-6 md:pt-8 text-muted-foreground font-medium text-sm md:text-base items-center justify-center">
                Trusted by 50,000+ businesses for innovative design and growth.
            </span> */}
            {/* Optional: Smaller button on mobile */}
            {/* <Link href={'/'} className="md:hidden block mt-3">
                <Button className="rounded-full flex items-center justify-center text-xs" variant={'secondary'}>Manage products end to end. <ArrowRight className="bg-muted-foreground rounded-full h-3 w-3" /> </Button>
            </Link> */}
        </div>
    );
};

export default Title;