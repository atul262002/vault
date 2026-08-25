"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import axios from "axios"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Send } from "lucide-react"

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
  const [conversation, setConversation] = useState<any>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const fetchMessages = useCallback(async () => {
    try {
      const response = await fetch("/api/user/get-user")
      const currentUser = await response.json()
      setUserId(currentUser.id)

      if (conversationId) {
        const convRes = await fetch(`/api/conversations/${conversationId}`);
        if (convRes.ok) setConversation(await convRes.json());

        const res = await fetch(`/api/conversations/${conversationId}/messages`);
        if (res.ok) {
          setMessages(await res.json());
          await fetch(`/api/conversations/${conversationId}/read`, { method: "POST" });
        }
      } else if (productId && receiverId) {
        const res = await fetch(`/api/messages/conversation`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId, receiverId }),
        })
        setMessages(await res.json())
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
        await axios.post(`/api/conversations/${conversationId}/messages`, { content: input });
      } else if (productId && receiverId) {
        await axios.post("/api/messages/send", { content: input, receiverId, productId })
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

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const otherParticipant = conversation?.participants?.find((p: any) => p.id !== userId);
  const displayName = otherParticipant?.name || otherParticipant?.email || "Chat";

  return (
    <div className="flex flex-col h-full w-full bg-background">
      {/* Mobile back header */}
      <div className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-border bg-card">
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground hover:bg-accent"
          onClick={() => window.location.href = "/chats"}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <span className="font-semibold text-foreground">{displayName}</span>
      </div>

      {/* Desktop name header */}
      <div className="hidden md:flex items-center px-5 py-3 border-b border-border bg-card">
        <span className="font-semibold text-foreground">{displayName}</span>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground text-sm">No messages yet. Say hello!</p>
          </div>
        )}
        {messages.map((msg) => {
          const isMine = msg.senderId === userId;
          return (
            <div
              key={msg.id}
              className={`flex ${isMine ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm leading-relaxed break-words
                  ${isMine
                    ? "bg-indigo-600 text-white rounded-br-sm"
                    : "bg-secondary text-foreground rounded-bl-sm"
                  }`}
              >
                {msg.content}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="px-4 py-3 border-t border-border bg-card flex gap-2 items-center">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 bg-secondary border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-indigo-500 rounded-xl"
          disabled={sending}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
        />
        <Button
          onClick={sendMessage}
          disabled={sending || !input.trim()}
          size="icon"
          className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl h-10 w-10 flex-shrink-0 disabled:opacity-40"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

export default Chat
