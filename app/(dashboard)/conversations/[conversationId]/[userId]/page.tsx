"use client"
import { useEffect, useState } from "react";
import Chat from "../../../chats/page";

interface ChatPageProps {
  params: { conversationId: string; userId: string };
}

export default function ChatPage({ params }: ChatPageProps) {
    const [currentId, setCurrentId] = useState<string>()

    useEffect(() => {
        const fetchUser = async () => {
            const res = await fetch("/api/user/get-user")
            const data = await res.json()
            setCurrentId(data.id)
        }
        fetchUser()
    }, [])
    return (
        <main className="h-screen w-full bg-white">
            <Chat conversationId={params.conversationId} currentUserId={currentId ?? ""} recieverId={params.userId}/>
        </main>
    );
}
