import React from "react";

interface GridBackgroundProps {
    children: React.ReactNode;
}

export function GridBackground({ children }: GridBackgroundProps) {
    return (
        <div className="relative w-full h-[40rem] sm:h-[60rem] flex items-center justify-center overflow-hidden bg-background">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--grid-color)_1px,transparent_1px),linear-gradient(to_bottom,var(--grid-color)_1px,transparent_1px)] bg-[size:40px_40px] opacity-40"></div>

            <div className="relative z-10 text-4xl sm:text-7xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-muted-foreground to-foreground py-8">
                {children}
            </div>
        </div>
    );
}