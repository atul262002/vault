"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { MessageSquarePlus } from "lucide-react";

interface Conversation {
    id: string;
    participants: {
        id: string;
        name?: string;
        email?: string;
    }[];
    lastMessage?: {
        content: string;
        createdAt: string;
    };
    unreadCount: number;
}

export default function ChatSidebar({ children }: { children?: React.ReactNode }) {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loading, setLoading] = useState(true);
    const pathname = usePathname();

    const fetchConversations = async () => {
        try {
            const res = await fetch("/api/conversations");
            if (res.ok) {
                const data = await res.json();
                setConversations(data);
            }
        } catch (error) {
            console.error("Error fetching conversations:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchConversations();
        const interval = setInterval(fetchConversations, 5000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="flex h-[80vh] w-full overflow-hidden border rounded-xl shadow-lg m-4 bg-background">
            {/* Sidebar List */}
            <div className={cn(
                "w-full md:w-80 border-r flex-col bg-muted/10",
                pathname !== "/chats" ? "hidden md:flex" : "flex"
            )}>
                <div className="p-4 border-b flex justify-between items-center">
                    <span className="font-semibold text-base text-foreground">Chats</span>
                    <Link
                        href="/search"
                        className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors"
                    >
                        <MessageSquarePlus className="h-4 w-4" />
                        New Chat
                    </Link>
                </div>

                <ScrollArea className="flex-1">
                    <div className="flex flex-col gap-0.5 p-2">
                        {loading ? (
                            <p className="text-center p-4 text-muted-foreground text-sm">Loading...</p>
                        ) : conversations.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                                <MessageSquarePlus className="h-10 w-10 text-muted-foreground/30 mb-3" />
                                <p className="text-muted-foreground text-sm">No conversations yet.</p>
                                <p className="text-muted-foreground/70 text-xs mt-1">Click &quot;New Chat&quot; to start one.</p>
                            </div>
                        ) : (
                            conversations.map((conv) => {
                                const displayName = conv.participants.map(p => p.name || p.email || "User").join(", ");
                                const lastMsg = conv.lastMessage?.content || "No messages yet";
                                const date = conv.lastMessage?.createdAt
                                    ? new Date(conv.lastMessage.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
                                    : "";
                                const isActive = pathname === `/chats/${conv.id}`;

                                return (
                                    <Link
                                        key={conv.id}
                                        href={`/chats/${conv.id}`}
                                        className={cn(
                                            "flex items-center gap-3 p-3 rounded-lg transition-colors",
                                            isActive
                                                ? "bg-accent text-accent-foreground"
                                                : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                                        )}
                                    >
                                        <div className="relative flex-shrink-0">
                                            <Avatar className="h-9 w-9">
                                                <AvatarImage src="/avatars/01.png" />
                                                <AvatarFallback className="bg-indigo-900 text-indigo-200 text-xs">
                                                    {displayName.substring(0, 2).toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            {conv.unreadCount > 0 && (
                                                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white font-bold">
                                                    {conv.unreadCount}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex-1 overflow-hidden">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="font-medium text-sm truncate">{displayName}</span>
                                                <span className="text-[10px] text-muted-foreground/70 flex-shrink-0">{date}</span>
                                            </div>
                                            <p className="text-xs text-muted-foreground truncate mt-0.5">{lastMsg}</p>
                                        </div>
                                    </Link>
                                );
                            })
                        )}
                    </div>
                </ScrollArea>
            </div>

            {/* Main Chat Area */}
            <div className={cn("flex-1 flex flex-col bg-background", pathname === "/chats" ? "hidden md:flex" : "flex")}>
                {children ? children : (
                    <div className="flex flex-col items-center justify-center h-full gap-3">
                        <MessageSquarePlus className="h-12 w-12 text-muted-foreground/30" />
                        <p className="text-muted-foreground text-sm">Select a conversation to start chatting.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
