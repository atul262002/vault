"use client";
import React from "react";
import { ContainerScroll } from "../ui/container-scroll-animation";

export function Features() {
    return (
        <div
            id="demo"
            className="flex flex-col overflow-hidden gap-y-6 md:gap-y-10 lg:gap-y-12 py-8 md:py-16 px-4 md:px-8 lg:px-0"
        >
            <ContainerScroll
                titleComponent={
                    <div className="text-center">
                        <span className="text-lg md:text-xl text-muted-foreground">
                            ⭐ Product Overview
                        </span>
                        <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-black dark:text-white drop-shadow-lg dark:drop-shadow-[0_4px_10px_rgba(255,255,255,0.3)] leading-tight">
                            A frictionless experience prioritising your convenience and safety
                        </h1>
                        <h2 className="mt-3 md:mt-5 p-4 text-muted-foreground text-base md:text-lg max-w-2xl mx-auto">
                            An inclusive environment - built for anyone to use and everyone to trust.
                        </h2>
                    </div>
                }
            >
                <iframe
                    src="/video.mp4"
                    title="Demo video"
                    className="mx-auto rounded-xl md:rounded-2xl w-full h-[400px] md:h-[500px] lg:h-[600px]"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                />
            </ContainerScroll>
        </div>
    );
}
