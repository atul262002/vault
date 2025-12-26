"use client";

import { cn } from "@/lib/utils";
import React, { useEffect, useState } from "react";

export const InfiniteMovingCards = ({
  items,
  direction = "left",
  speed = "fast",
  pauseOnHover = true,
  className,
}: {
  items: {
    rating: number;
    quote: string;
    name: string;
    title: string;
  }[];
  direction?: "left" | "right";
  speed?: "fast" | "normal" | "slow";
  pauseOnHover?: boolean;
  className?: string;
}) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const scrollerRef = React.useRef<HTMLUListElement>(null);
  const [start, setStart] = useState(false);

  useEffect(() => {
    addAnimation();
  }, []);

  function addAnimation() {
    if (containerRef.current && scrollerRef.current) {
      const scrollerContent = Array.from(scrollerRef.current.children);

      scrollerContent.forEach((item) => {
        const duplicatedItem = item.cloneNode(true);
        if (scrollerRef.current) {
          scrollerRef.current.appendChild(duplicatedItem);
        }
      });

      getDirection();
      getSpeed();
      setStart(true);
    }
  }

  const getDirection = () => {
    if (containerRef.current) {
      containerRef.current.style.setProperty(
        "--animation-direction",
        direction === "left" ? "forwards" : "reverse"
      );
    }
  };

  const getSpeed = () => {
    if (containerRef.current) {
      const duration =
        speed === "fast" ? "20s" : speed === "normal" ? "40s" : "80s";
      containerRef.current.style.setProperty("--animation-duration", duration);
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex mb-2">
        {Array.from({ length: rating }).map((_, idx) => (
          <span key={idx} className="text-yellow-400 text-base">★</span>
        ))}
        {Array.from({ length: 5 - rating }).map((_, idx) => (
          <span key={idx} className="text-gray-600 text-base">★</span>
        ))}
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "scroller relative z-20 max-w-7xl overflow-hidden",
        "mask-gradient",
        className
      )}
    >
      <ul
        ref={scrollerRef}
        className={cn(
          "flex min-w-full shrink-0 gap-6 py-20 w-max flex-nowrap",
          start && "animate-scroll",
          pauseOnHover && "hover:[animation-play-state:paused]"
        )}
      >
        {items.map((item) => (
          <li
            className="w-[350px] max-w-full relative shrink-0 p-6 rounded-2xl border border-neutral-700 bg-gradient-to-br from-neutral-900/80 to-neutral-800/90 backdrop-blur-lg shadow-xl shadow-neutral-900/50"
            key={item.name}
          >
            <blockquote>
              {renderStars(item.rating)}
              <p className="relative z-20 text-base leading-relaxed text-gray-100 mb-4">
                “{item.quote}”
              </p>
              <div className="relative z-20 mt-2 flex flex-row items-center">
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-semibold text-gray-300">
                    {item.name}
                  </span>
                  <span className="text-sm text-gray-400">{item.title}</span>
                </div>
              </div>
            </blockquote>
          </li>
        ))}
      </ul>

      <style jsx>{`
        .animate-scroll {
          animation: scroll var(--animation-duration, 40s)
            linear var(--animation-direction, forwards) infinite;
        }

        @keyframes scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }

        .mask-gradient {
          mask-image: linear-gradient(
            to right,
            transparent,
            white 20%,
            white 80%,
            transparent
          );
        }
      `}</style>
    </div>
  );
};
