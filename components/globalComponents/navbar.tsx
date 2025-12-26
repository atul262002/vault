// "use client"

// import * as React from "react"
// import Link from "next/link"

// import { cn } from "@/lib/utils"
// import {
//     NavigationMenu,
//     NavigationMenuItem,
//     NavigationMenuLink,
//     NavigationMenuList,
//     NavigationMenuTrigger,
//     navigationMenuTriggerStyle,
// } from "@/components/ui/navigation-menu"
// import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs"
// import { ModeToggle } from "./themes"
// import { Menu } from "lucide-react";
// import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
// import { Button } from "@/components/ui/button";
// import { DialogTitle } from "@/components/ui/dialog";
// import { VisuallyHidden } from "@radix-ui/react-visually-hidden";


// export function Navbar() {
//     const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

//     const handleScroll = (id: string) => {
//         setIsMobileMenuOpen(false);
//         document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
//     };

//     return (
//         <div className="border-b text-primary sticky top-0 bg-background z-50">
//             <div className="flex items-center justify-between max-w-5xl mx-auto w-full p-3">
//                 <Link href="/" className="text-xl font-extrabold flex items-center justify-center">
//                     <img src="/logo.svg" alt="logo" className="h-12 w-12 flex items-center justify-center pt-2 rounded " />
//                     Vault
//                 </Link>
//                 <div className="hidden md:flex items-center gap-x-4">
//                     <NavigationMenu>
//                         <NavigationMenuList className="cursor-pointer flex items-center">
//                             <NavigationMenuItem>
//                                 <NavigationMenuLink className={navigationMenuTriggerStyle()} href="/">Home</NavigationMenuLink>
//                             </NavigationMenuItem>
//                             <NavigationMenuItem>
//                                 <NavigationMenuLink
//                                     className={navigationMenuTriggerStyle()}
//                                     onClick={(e) => {
//                                         e.preventDefault();
//                                         document.getElementById("demo")?.scrollIntoView({ behavior: "smooth" });
//                                     }}
//                                 >
//                                     Demo
//                                 </NavigationMenuLink>
//                             </NavigationMenuItem>

//                             <NavigationMenuItem>
//                                 <NavigationMenuLink
//                                     className={navigationMenuTriggerStyle()}
//                                     onClick={(e) => {
//                                         e.preventDefault();
//                                         document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
//                                     }}
//                                 >
//                                     Features
//                                 </NavigationMenuLink>
//                             </NavigationMenuItem>

//                             <NavigationMenuItem>
//                                 <NavigationMenuLink
//                                     className={navigationMenuTriggerStyle()}
//                                     onClick={(e) => {
//                                         e.preventDefault();
//                                         document.getElementById("reviews")?.scrollIntoView({ behavior: "smooth" });
//                                     }}
//                                 >
//                                     Reviews
//                                 </NavigationMenuLink>
//                             </NavigationMenuItem>

//                             <NavigationMenuItem>
//                                 <NavigationMenuLink
//                                     className={navigationMenuTriggerStyle()}
//                                     onClick={(e) => {
//                                         e.preventDefault();
//                                         document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" });
//                                     }}
//                                 >
//                                     Contact Us
//                                 </NavigationMenuLink>
//                             </NavigationMenuItem>
//                         </NavigationMenuList>
//                     </NavigationMenu>
//                     {/* <Link href={"/sign-in"} className="rounded-lg px-4 bg-primary p-1.5 text-secondary text-sm">
//                         Log in
//                     </Link>
//                     <Link href={"/sign-up"} className="rounded-lg px-4 bg-secondary border text-primary p-1.5  text-sm">
//                         Sign up
//                     </Link> */}
//                     {/* ✅ Only show when signed OUT */}
//           <SignedOut>
//             <Link href="/sign-in" className="rounded-lg px-4 bg-primary p-1.5 text-secondary text-sm">
//               Log in
//             </Link>
//             <Link href="/sign-up" className="rounded-lg px-4 bg-secondary border text-primary p-1.5 text-sm">
//               Sign up
//             </Link>
//           </SignedOut>

//           {/* ✅ Only show when signed IN */}
//           <SignedIn>
//             <UserButton afterSignOutUrl="/" />
//           </SignedIn>
//                     <ModeToggle />
//                 </div>
//                 <div className="md:hidden flex items-center gap-x-2"> {/* Flex container for menu and theme toggle */}
//                     <ModeToggle />
//                     <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
//                         <SheetTrigger asChild>
//                             <Button variant="ghost" size="icon">
//                                 <Menu className="h-5 w-5" />
//                             </Button>
//                         </SheetTrigger>
//                         <SheetContent className="bg-background/95 backdrop-blur-sm flex flex-col p-4">
//                             <VisuallyHidden>
//                                 <DialogTitle>Mobile Navigation Menu</DialogTitle>
//                             </VisuallyHidden>
//                             <nav className="py-2">
//                                 <ul className="space-y-2">
//                                     <li>
//                                         <Link href="/" className="block  font-semibold hover:text-primary p-2 rounded" onClick={() => setIsMobileMenuOpen(false)}>
//                                             Home
//                                         </Link>
//                                     </li>
//                                     <li>
//                                         <Button variant="ghost" className="w-full justify-start hover:text-primary p-2 rounded" onClick={() => handleScroll("demo")}>
//                                             Demo
//                                         </Button>
//                                     </li>
//                                     <li>
//                                         <Button variant="ghost" className="w-full justify-start hover:text-primary p-2 rounded" onClick={() => handleScroll("features")}>
//                                             Features
//                                         </Button>
//                                     </li>
//                                     <li>
//                                         <Button variant="ghost" className="w-full justify-start hover:text-primary p-2 rounded" onClick={() => handleScroll("reviews")}>
//                                             Reviews
//                                         </Button>
//                                     </li>
//                                     <li>
//                                         <Button variant="ghost" className="w-full justify-start hover:text-primary p-2 rounded" onClick={() => handleScroll("contact")}>
//                                             Contact Us
//                                         </Button>
//                                     </li>
//                                 </ul>
//                             </nav>
//                             <div className="mt-4 flex flex-col space-y-2"> {/* Stacked full-width buttons */}
//                                 <Link href={"/sign-in"} className="rounded-md w-full py-2 bg-primary text-secondary text-sm text-center">
//                                     Log in
//                                 </Link>
//                                 <Link href={"/sign-up"} className="rounded-md w-full py-2 bg-secondary border text-primary text-sm text-center">
//                                     Sign up
//                                 </Link>
//                             </div>
//                         </SheetContent>
//                     </Sheet>
//                 </div>
//             </div>
//         </div>
//     )
// }


// const ListItem = React.forwardRef<
//     React.ElementRef<"a">,
//     React.ComponentPropsWithoutRef<"a">
// >(({ className, title, children, ...props }, ref) => {
//     return (
//         <li>
//             <NavigationMenuLink asChild>
//                 <a
//                     ref={ref}
//                     className={cn(
//                         "block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
//                         className
//                     )}
//                     {...props}
//                 >
//                     <div className="text-sm font-medium leading-none">{title}</div>
//                     <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
//                         {children}
//                     </p>
//                 </a>
//             </NavigationMenuLink>
//         </li>
//     )
// })
// ListItem.displayName = "ListItem"




// "use client"

// import * as React from "react"
// import Link from "next/link"
// import { usePathname } from "next/navigation"

// import { cn } from "@/lib/utils"
// import {
//     NavigationMenu,
//     NavigationMenuItem,
//     NavigationMenuLink,
//     NavigationMenuList,
//     NavigationMenuTrigger,
//     navigationMenuTriggerStyle,
// } from "@/components/ui/navigation-menu"
// import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs"
// import { ModeToggle } from "./themes"
// import { Menu } from "lucide-react";
// import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
// import { Button } from "@/components/ui/button";
// import { DialogTitle } from "@/components/ui/dialog";
// import { VisuallyHidden } from "@radix-ui/react-visually-hidden";


// export function Navbar() {
//     const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
//     const pathname = usePathname();
//     const isDashboard = pathname?.startsWith('/dashboard');

//     const handleScroll = (id: string) => {
//         setIsMobileMenuOpen(false);
//         document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
//     };

//     return (
//         <div className="border-b text-primary sticky top-0 bg-background z-50">
//             <div className="flex items-center justify-between max-w-5xl mx-auto w-full p-3">
//                 <Link href="/" className="text-xl font-extrabold flex items-center justify-center">
//                     <img src="/logo.svg" alt="logo" className="h-12 w-12 flex items-center justify-center pt-2 rounded " />
//                     Vault
//                 </Link>
//                 <div className="hidden md:flex items-center gap-x-4">
//                     <NavigationMenu>
//                         <NavigationMenuList className="cursor-pointer flex items-center">
//                             <NavigationMenuItem>
//                                 <NavigationMenuLink className={navigationMenuTriggerStyle()} href="/">Home</NavigationMenuLink>
//                             </NavigationMenuItem>
//                             <NavigationMenuItem>
//                                 <NavigationMenuLink
//                                     className={navigationMenuTriggerStyle()}
//                                     onClick={(e) => {
//                                         e.preventDefault();
//                                         document.getElementById("demo")?.scrollIntoView({ behavior: "smooth" });
//                                     }}
//                                 >
//                                     Demo
//                                 </NavigationMenuLink>
//                             </NavigationMenuItem>

//                             <NavigationMenuItem>
//                                 <NavigationMenuLink
//                                     className={navigationMenuTriggerStyle()}
//                                     onClick={(e) => {
//                                         e.preventDefault();
//                                         document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
//                                     }}
//                                 >
//                                     Features
//                                 </NavigationMenuLink>
//                             </NavigationMenuItem>

//                             <NavigationMenuItem>
//                                 <NavigationMenuLink
//                                     className={navigationMenuTriggerStyle()}
//                                     onClick={(e) => {
//                                         e.preventDefault();
//                                         document.getElementById("reviews")?.scrollIntoView({ behavior: "smooth" });
//                                     }}
//                                 >
//                                     Reviews
//                                 </NavigationMenuLink>
//                             </NavigationMenuItem>

//                             <NavigationMenuItem>
//                                 <NavigationMenuLink
//                                     className={navigationMenuTriggerStyle()}
//                                     onClick={(e) => {
//                                         e.preventDefault();
//                                         document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" });
//                                     }}
//                                 >
//                                     Contact Us
//                                 </NavigationMenuLink>
//                             </NavigationMenuItem>
//                         </NavigationMenuList>
//                     </NavigationMenu>

//                     {/* ✅ Only show when signed OUT */}
//                     <SignedOut>
//                         <Link href="/sign-in" className="rounded-lg px-4 bg-primary p-1.5 text-secondary text-sm">
//                             Log in
//                         </Link>
//                         <Link href="/sign-up" className="rounded-lg px-4 bg-secondary border text-primary p-1.5 text-sm">
//                             Sign up
//                         </Link>
//                     </SignedOut>

//                     {/* ✅ Only show when signed IN */}
//                     <SignedIn>
//                         {!isDashboard && (
//                             <Link href="/dashboard" className="rounded-lg px-4 bg-primary p-1.5 text-secondary text-sm font-medium hover:bg-primary/90 transition-colors">
//                                 Dashboard
//                             </Link>
//                         )}
//                         <UserButton afterSignOutUrl="/" />
//                     </SignedIn>
//                     <ModeToggle />
//                 </div>
//                 <div className="md:hidden flex items-center gap-x-2">
//                     <ModeToggle />
//                     <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
//                         <SheetTrigger asChild>
//                             <Button variant="ghost" size="icon">
//                                 <Menu className="h-5 w-5" />
//                             </Button>
//                         </SheetTrigger>
//                         <SheetContent className="bg-background/95 backdrop-blur-sm flex flex-col p-4">
//                             <VisuallyHidden>
//                                 <DialogTitle>Mobile Navigation Menu</DialogTitle>
//                             </VisuallyHidden>
//                             <nav className="py-2">
//                                 <ul className="space-y-2">
//                                     <li>
//                                         <Link href="/" className="block font-semibold hover:text-primary p-2 rounded" onClick={() => setIsMobileMenuOpen(false)}>
//                                             Home
//                                         </Link>
//                                     </li>
//                                     <li>
//                                         <Button variant="ghost" className="w-full justify-start hover:text-primary p-2 rounded" onClick={() => handleScroll("demo")}>
//                                             Demo
//                                         </Button>
//                                     </li>
//                                     <li>
//                                         <Button variant="ghost" className="w-full justify-start hover:text-primary p-2 rounded" onClick={() => handleScroll("features")}>
//                                             Features
//                                         </Button>
//                                     </li>
//                                     <li>
//                                         <Button variant="ghost" className="w-full justify-start hover:text-primary p-2 rounded" onClick={() => handleScroll("reviews")}>
//                                             Reviews
//                                         </Button>
//                                     </li>
//                                     <li>
//                                         <Button variant="ghost" className="w-full justify-start hover:text-primary p-2 rounded" onClick={() => handleScroll("contact")}>
//                                             Contact Us
//                                         </Button>
//                                     </li>
//                                 </ul>
//                             </nav>
                            
//                             {/* Mobile: Show different buttons based on auth state */}
//                             <SignedOut>
//                                 <div className="mt-4 flex flex-col space-y-2">
//                                     <Link href="/sign-in" className="rounded-md w-full py-2 bg-primary text-secondary text-sm text-center">
//                                         Log in
//                                     </Link>
//                                     <Link href="/sign-up" className="rounded-md w-full py-2 bg-secondary border text-primary text-sm text-center">
//                                         Sign up
//                                     </Link>
//                                 </div>
//                             </SignedOut>

//                             <SignedIn>
//                                 <div className="mt-4 flex flex-col space-y-2">
//                                     {!isDashboard && (
//                                         <Link href="/dashboard" className="rounded-md w-full py-2 bg-primary text-secondary text-sm text-center font-medium" onClick={() => setIsMobileMenuOpen(false)}>
//                                             Dashboard
//                                         </Link>
//                                     )}
//                                     <div className="flex justify-center pt-2">
//                                         <UserButton afterSignOutUrl="/" />
//                                     </div>
//                                 </div>
//                             </SignedIn>
//                         </SheetContent>
//                     </Sheet>
//                 </div>
//             </div>
//         </div>
//     )
// }


// const ListItem = React.forwardRef<
//     React.ElementRef<"a">,
//     React.ComponentPropsWithoutRef<"a">
// >(({ className, title, children, ...props }, ref) => {
//     return (
//         <li>
//             <NavigationMenuLink asChild>
//                 <a
//                     ref={ref}
//                     className={cn(
//                         "block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
//                         className
//                     )}
//                     {...props}
//                 >
//                     <div className="text-sm font-medium leading-none">{title}</div>
//                     <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
//                         {children}
//                     </p>
//                 </a>
//             </NavigationMenuLink>
//         </li>
//     )
// })
// ListItem.displayName = "ListItem"



"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"

import { cn } from "@/lib/utils"
import {
    NavigationMenu,
    NavigationMenuItem,
    NavigationMenuLink,
    NavigationMenuList,
    NavigationMenuTrigger,
    navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu"
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs"
import { ModeToggle } from "./themes"
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";


export function Navbar() {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
    const pathname = usePathname();
    const router = useRouter();
    const isDashboard = pathname?.startsWith('/dashboard');

    const handleNavigation = (id: string) => {
        setIsMobileMenuOpen(false);
        
        // If not on home page, navigate to home first, then scroll
        if (pathname !== '/') {
            router.push(`/#${id}`);
            // Wait for navigation to complete, then scroll
            setTimeout(() => {
                document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
            }, 100);
        } else {
            // Already on home page, just scroll
            document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
        }
    };

    return (
        <div className="border-b text-primary sticky top-0 bg-background z-50">
            <div className="flex items-center justify-between max-w-5xl mx-auto w-full p-3">
                <Link href="/" className="text-xl font-extrabold flex items-center justify-center">
                    <img src="/logo.svg" alt="logo" className="h-12 w-12 flex items-center justify-center pt-2 rounded " />
                    Vault
                </Link>
                <div className="hidden md:flex items-center gap-x-4">
                    <NavigationMenu>
                        <NavigationMenuList className="cursor-pointer flex items-center">
                            <NavigationMenuItem>
                                <NavigationMenuLink className={navigationMenuTriggerStyle()} href="/">Home</NavigationMenuLink>
                            </NavigationMenuItem>
                            <NavigationMenuItem>
                                <NavigationMenuLink
                                    className={navigationMenuTriggerStyle()}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        handleNavigation("demo");
                                    }}
                                >
                                    Demo
                                </NavigationMenuLink>
                            </NavigationMenuItem>

                            <NavigationMenuItem>
                                <NavigationMenuLink
                                    className={navigationMenuTriggerStyle()}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        handleNavigation("features");
                                    }}
                                >
                                    Features
                                </NavigationMenuLink>
                            </NavigationMenuItem>

                            <NavigationMenuItem>
                                <NavigationMenuLink
                                    className={navigationMenuTriggerStyle()}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        handleNavigation("reviews");
                                    }}
                                >
                                    Reviews
                                </NavigationMenuLink>
                            </NavigationMenuItem>

                            <NavigationMenuItem>
                                <NavigationMenuLink
                                    className={navigationMenuTriggerStyle()}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        handleNavigation("contact");
                                    }}
                                >
                                    Contact Us
                                </NavigationMenuLink>
                            </NavigationMenuItem>
                        </NavigationMenuList>
                    </NavigationMenu>

                    {/* ✅ Only show when signed OUT */}
                    <SignedOut>
                        <Link href="/sign-in" className="rounded-lg px-4 bg-primary p-1.5 text-secondary text-sm">
                            Log in
                        </Link>
                        <Link href="/sign-up" className="rounded-lg px-4 bg-secondary border text-primary p-1.5 text-sm">
                            Sign up
                        </Link>
                    </SignedOut>

                    {/* ✅ Only show when signed IN */}
                    <SignedIn>
                        {!isDashboard && (
                            <Link href="/dashboard" className="rounded-lg px-4 bg-primary p-1.5 text-secondary text-sm font-medium hover:bg-primary/90 transition-colors">
                                Dashboard
                            </Link>
                        )}
                        <UserButton afterSignOutUrl="/" />
                    </SignedIn>
                    <ModeToggle />
                </div>
                <div className="md:hidden flex items-center gap-x-2">
                    <ModeToggle />
                    <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="icon">
                                <Menu className="h-5 w-5" />
                            </Button>
                        </SheetTrigger>
                        <SheetContent className="bg-background/95 backdrop-blur-sm flex flex-col p-4">
                            <VisuallyHidden>
                                <DialogTitle>Mobile Navigation Menu</DialogTitle>
                            </VisuallyHidden>
                            <nav className="py-2">
                                <ul className="space-y-2">
                                    <li>
                                        <Link href="/" className="block font-semibold hover:text-primary p-2 rounded" onClick={() => setIsMobileMenuOpen(false)}>
                                            Home
                                        </Link>
                                    </li>
                                    <li>
                                        <Button variant="ghost" className="w-full justify-start hover:text-primary p-2 rounded" onClick={() => handleNavigation("demo")}>
                                            Demo
                                        </Button>
                                    </li>
                                    <li>
                                        <Button variant="ghost" className="w-full justify-start hover:text-primary p-2 rounded" onClick={() => handleNavigation("features")}>
                                            Features
                                        </Button>
                                    </li>
                                    <li>
                                        <Button variant="ghost" className="w-full justify-start hover:text-primary p-2 rounded" onClick={() => handleNavigation("reviews")}>
                                            Reviews
                                        </Button>
                                    </li>
                                    <li>
                                        <Button variant="ghost" className="w-full justify-start hover:text-primary p-2 rounded" onClick={() => handleNavigation("contact")}>
                                            Contact Us
                                        </Button>
                                    </li>
                                </ul>
                            </nav>
                            
                            {/* Mobile: Show different buttons based on auth state */}
                            <SignedOut>
                                <div className="mt-4 flex flex-col space-y-2">
                                    <Link href="/sign-in" className="rounded-md w-full py-2 bg-primary text-secondary text-sm text-center">
                                        Log in
                                    </Link>
                                    <Link href="/sign-up" className="rounded-md w-full py-2 bg-secondary border text-primary text-sm text-center">
                                        Sign up
                                    </Link>
                                </div>
                            </SignedOut>

                            <SignedIn>
                                <div className="mt-4 flex flex-col space-y-2">
                                    {!isDashboard && (
                                        <Link href="/dashboard" className="rounded-md w-full py-2 bg-primary text-secondary text-sm text-center font-medium" onClick={() => setIsMobileMenuOpen(false)}>
                                            Dashboard
                                        </Link>
                                    )}
                                    <div className="flex justify-center pt-2">
                                        <UserButton afterSignOutUrl="/" />
                                    </div>
                                </div>
                            </SignedIn>
                        </SheetContent>
                    </Sheet>
                </div>
            </div>
        </div>
    )
}


const ListItem = React.forwardRef<
    React.ElementRef<"a">,
    React.ComponentPropsWithoutRef<"a">
>(({ className, title, children, ...props }, ref) => {
    return (
        <li>
            <NavigationMenuLink asChild>
                <a
                    ref={ref}
                    className={cn(
                        "block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:bg-accent-foreground",
                        className
                    )}
                    {...props}
                >
                    <div className="text-sm font-medium leading-none">{title}</div>
                    <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                        {children}
                    </p>
                </a>
            </NavigationMenuLink>
        </li>
    )
})
ListItem.displayName = "ListItem"