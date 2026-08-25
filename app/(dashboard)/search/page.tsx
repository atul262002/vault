"use client"
import UserSearch from "@/components/userComponents/user-search";
import { useEffect, useState } from "react";
import { MessageSquarePlus } from "lucide-react";

export default function SearchPage() {
    const [userId, setUserId] = useState<string>()

    useEffect(() => {
        const fetchUser = async () => {
            const res = await fetch("/api/user/get-user")
            const data = await res.json()
            setUserId(data.id)
            localStorage.setItem("userData", data.id);
        }
        fetchUser()
    }, [])

    return (
        <main className="w-full min-h-full p-6 bg-background flex flex-col items-center">
            <div className="w-full max-w-lg">
                <div className="flex items-center gap-3 mb-6">
                    <MessageSquarePlus className="h-6 w-6 text-indigo-400" />
                    <div>
                        <h1 className="text-lg font-semibold text-foreground">New Chat</h1>
                        <p className="text-xs text-muted-foreground">Search for a user to start a conversation</p>
                    </div>
                </div>
                <UserSearch currentUserId={userId ?? ""} />
            </div>
        </main>
    );
}
