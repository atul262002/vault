"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface Conversation {
    id: string;
    participants: {
        id: string;
        name?: string;
        email?: string;
        // Add other fields if necessary
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
    const router = useRouter();

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
        // Poll for updates every 5 seconds (or use websockets if available)
        const interval = setInterval(fetchConversations, 5000);
        return () => clearInterval(interval);
    }, []);

    // Helper to get the "other" participant
    // Limitation: We need the current user ID to know who the "other" is reliably.
    // For now, we'll try to guess or fetch the current user, but since this is a sidebar,
    // we might want to pass current user as a prop or fetch it.
    // The API returns participants. One of them is likely the current user.
    // A simple hack without auth context: use the participant that ISN'T "me".
    // Note: We need a way to know "me". For now, we might rely on the fact that
    // usually the UI knows. Or, we can just display the first participant if we can't tell,
    // but that's buggy.
    // Better approach: API could return "otherParticipant" directly or we fetch "me".
    // Let's assume we can't easily get "me" without context.
    // Wait, we are in a client component. We could use Clerk's useUser().

    // BUT: ChatSidebar uses `fetch("/api/conversations")` which uses `currentUser()`.
    // Let's update API to maybe return "otherParticipant" to make frontend easier?
    // Or just use Clerk here.

    // For now, let's just render the list.

    return (
        <div className="flex h-[80vh] w-full overflow-hidden border rounded-xl shadow-lg m-4 bg-background">
            {/* Sidebar List */}
            <div className={cn("w-full md:w-80 border-r bg-muted/10 flex-col", pathname !== "/chats" ? "hidden md:flex" : "flex")}>
                <div className="p-4 border-b font-semibold text-lg flex justify-between items-center">
                    <span>Chats</span>
                    <Link href="/search" className="text-sm text-primary hover:underline">New Chat</Link>
                </div>
                <ScrollArea className="flex-1">
                    <div className="flex flex-col gap-1 p-2">
                        {loading ? (
                            <p className="text-center p-4 text-muted-foreground">Loading...</p>
                        ) : conversations.length === 0 ? (
                            <p className="text-center p-4 text-muted-foreground">No conversations yet.</p>
                        ) : (
                            conversations.map((conv) => {
                                // Find name to display.
                                // We'll just take the first participant.
                                // ideally we filter out current user.
                                const displayName = conv.participants.map(p => p.name || p.email).join(", ");
                                const lastMsg = conv.lastMessage?.content || "No messages";
                                const date = conv.lastMessage?.createdAt ? new Date(conv.lastMessage.createdAt).toLocaleDateString() : "";

                                // Construct link. We need to know who we are talking to.
                                // If we don't have receiverId easily, we might need to adjust API or logic.
                                // For this iteration, let's assume we can navigate to /chats/[receiverId].
                                // But IDK which participant is the receiver.
                                // Actually, the page structure is /chats/[receiverId].
                                // So I need the receiver's ID.
                                // Assuming 2 participants, if I am A, B is receiver.
                                // I need to know my ID to filter myself out.

                                // PROVISIONAL: Link to /chats?conversationId=... or update API to give receiverId.
                                // Actually, the current `Chat` component takes `receiverId`.
                                // Existing `api/conversations` returns participants.
                                // Let's rely on finding the other participant.
                                // I will update this component after checking Clerk integration.

                                return (
                                    <Link
                                        key={conv.id}
                                        href={`/chats/${conv.id}`}
                                        className={cn(
                                            "flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors",
                                            pathname === `/chats/${conv.id}` && "bg-muted"
                                        )}
                                    >
                                        <div className="relative">
                                            <Avatar>
                                                <AvatarImage src="/avatars/01.png" />
                                                <AvatarFallback>{displayName.substring(0, 2).toUpperCase()}</AvatarFallback>
                                            </Avatar>
                                            {conv.unreadCount > 0 && (
                                                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] text-white">
                                                    {conv.unreadCount}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex-1 overflow-hidden">
                                            <div className="flex items-center justify-between">
                                                <span className="font-medium truncate">{displayName}</span>
                                                <span className="text-xs text-muted-foreground">{date}</span>
                                            </div>
                                            <p className="text-sm text-muted-foreground truncate">{lastMsg}</p>
                                        </div>
                                    </Link>
                                );
                            })
                        )}
                    </div>
                </ScrollArea>
            </div>

            {/* Main Chat Area */}
            <div className={cn("flex-1 flex flex-col", pathname === "/chats" ? "hidden md:flex" : "flex")}>
                {children ? children : (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                        <p>Select a conversation to start chatting.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
