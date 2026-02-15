import ChatSidebar from "@/components/chatComponents/chat-sidebar";
import React from 'react';

export default function ChatsLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex w-full items-center justify-center bg-muted/20 p-2">
            <ChatSidebar>{children}</ChatSidebar>
        </div>
    );
}
