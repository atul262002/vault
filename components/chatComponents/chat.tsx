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
  productId: string;
  receiverId: string
}

const Chat: React.FC<ChatProps> = ({ receiverId, productId }) => {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [userId, setUserId] = useState<string>()
  const [sending, setSending] = useState<boolean>(false) 

  const fetchMessages = useCallback(async () => {
    try {
      const response = await fetch("/api/user/get-user")
      const currentUser = await response.json()
      setUserId(currentUser.id)

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
    } catch (error) {
      console.error("Error fetching messages:", error)
    }
  }, [receiverId, productId])

  const sendMessage = async () => {
    if (!input.trim() || sending) return

    setSending(true) 
    try {
      await axios.post("/api/messages/send", {
        content: input,
        receiverId,
        productId
      })
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


  return (
    <div className="flex flex-col p-4 border rounded-lg bg-transparent shadow-sm w-full mx-auto">
      <div className="flex-1 space-y-2 overflow-y-auto pr-2">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`w-fit max-w-[80%] p-2 rounded text-sm ${
              msg.senderId === userId
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
        />
        <Button onClick={sendMessage} disabled={sending}>
          {sending ? "Sending..." : "Send"}
        </Button>
      </div>
    </div>
  )
}

export default Chat
