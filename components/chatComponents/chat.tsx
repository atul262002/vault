"use client"

import { useEffect, useState, useCallback } from "react"
import axios from "axios"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface Message {
  id: string
  content: string
  senderId: string
  receiverId: string
  createdAt: string
}

interface ChatProps {
  productId?: string;
  receiverId?: string;
  conversationId?: string;
}

const Chat: React.FC<ChatProps> = ({ receiverId, productId, conversationId }) => {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [userId, setUserId] = useState<string>()
  const [sending, setSending] = useState<boolean>(false)
  const [conversation, setConversation] = useState<any>(null);

  const fetchMessages = useCallback(async () => {
    try {
      const response = await fetch("/api/user/get-user")
      const currentUser = await response.json()
      setUserId(currentUser.id)

      if (conversationId) {
        // Fetch conversation details
        const convRes = await fetch(`/api/conversations/${conversationId}`);
        if (convRes.ok) {
          setConversation(await convRes.json());
        }

        const res = await fetch(`/api/conversations/${conversationId}/messages`);
        if (res.ok) {
          const data = await res.json();
          setMessages(data);

          // Mark as read
          await fetch(`/api/conversations/${conversationId}/read`, { method: "POST" });
        }
      } else if (productId && receiverId) {
        const res = await fetch(`/api/messages/conversation`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productId,
            receiverId,
          }),
        })
        const data = await res.json()
        setMessages(data)
      }
    } catch (error) {
      console.error("Error fetching messages:", error)
    }
  }, [receiverId, productId, conversationId])

  const sendMessage = async () => {
    if (!input.trim() || sending) return

    setSending(true)
    try {
      if (conversationId) {
        await axios.post(`/api/conversations/${conversationId}/messages`, {
          content: input,
          // receiverId might be inferred by backend for existing conversation
        });
      } else if (productId && receiverId) {
        await axios.post("/api/messages/send", {
          content: input,
          receiverId,
          productId
        })
      }
      setInput("")
      await fetchMessages()
    } catch (error) {
      console.error("Error sending message:", error)
    } finally {
      setSending(false)
    }
  }

  useEffect(() => {
    fetchMessages()
    const interval = setInterval(fetchMessages, 3000)
    return () => clearInterval(interval)
  }, [fetchMessages])

  const otherParticipant = conversation?.participants?.find((p: any) => p.id !== userId);
  const displayName = otherParticipant?.name || otherParticipant?.email || "Chat";

  return (
    <div className="flex flex-col p-4 border rounded-lg bg-transparent shadow-sm w-full mx-auto h-full">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center gap-3 pb-4 border-b mb-4">
        <Button variant="ghost" size="icon" onClick={() => window.location.href = '/chats'}>
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-arrow-left"><path d="m12 19-7-7 7-7" /><path d="M19 12H5" /></svg>
        </Button>
        <span className="font-semibold text-lg">{displayName}</span>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto pr-2">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`w-fit max-w-[80%] p-2 rounded text-sm ${msg.senderId === userId
              ? "bg-neutral-200 text-black ml-auto"
              : "bg-blue-600 text-white mr-auto"
              }`}
          >
            {msg.content}
          </div>
        ))}
      </div>

      <div className="mt-4 flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          className="flex-1"
          disabled={sending}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
        />
        <Button onClick={sendMessage} disabled={sending}>
          {sending ? "Sending..." : "Send"}
        </Button>
      </div>
    </div>
  )
}

export default Chat
