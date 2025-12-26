"use client"
import UserSearch from "@/components/userComponents/user-search";
import { useEffect, useState } from "react";


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
        <main className="w-full h-full p-4 bg-secondary flex flex-col items-center justify-center mx-auto">
            <h1 className="text-2xl font-bold mb-4">Search Users to Chat</h1>
            <UserSearch currentUserId={userId ?? ""} />
        </main>
    );
}
