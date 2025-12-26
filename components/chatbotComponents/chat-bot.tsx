'use client'

import { useState, useRef, useEffect, FormEvent } from 'react'
import axios from 'axios'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { MessageSquare, X, Trash2 } from 'lucide-react'

type Message = {
    role: 'user' | 'assistant'
    content: string
}

export default function Chatbot() {
    const [messages, setMessages] = useState<Message[]>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('vault-chat')
            return saved
                ? JSON.parse(saved)
                : [{ role: 'assistant', content: 'Hi! How can I help you today?' }]
        }
        return []
    })

    const [input, setInput] = useState('')
    const [isOpen, setIsOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const bottomRef = useRef<HTMLDivElement | null>(null)

    const sendMessage = async (e: FormEvent) => {
        e.preventDefault()
        if (!input.trim()) return

        const userMsg: Message = { role: 'user', content: input }
        setMessages(prev => [...prev, userMsg])
        setInput('')

        setLoading(true)
        try {
            const res = await axios.post('/api/chatbot/chat', {
                message: input,
                history: messages,
            })

            const { reply } = res.data
            setMessages(prev => [...prev, { role: 'assistant', content: reply }])
        } catch (error) {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: 'Oops! Something went wrong. Please try again.'
            }])
        } finally {
            setLoading(false)
        }
    }


    const clearChat = () => {
        const welcome = { role: 'assistant', content: 'Hi! How can I help you today?' }
        setMessages([welcome])
        localStorage.removeItem('vault-chat')
    }

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages, loading])

    useEffect(() => {
        localStorage.setItem('vault-chat', JSON.stringify(messages))
    }, [messages])

    return (
        <div className="fixed bottom-4 right-4 z-50 sm:bottom-6 sm:right-6 md:bottom-8 md:right-8">
            {!isOpen ? (
                <Button onClick={() => setIsOpen(true)} className="rounded-full p-3 shadow-lg">
                    <MessageSquare size={20} />
                </Button>
            ) : (
                <Card className="w-[90vw] max-w-[400px] h-[70vh] max-h-[600px] flex flex-col shadow-2xl border">
                    <div className="flex justify-between items-center p-3 border-b">
                        <p className="font-semibold">Vault Bot</p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={clearChat}
                                className="text-gray-500 hover:text-gray-800 transition"
                                title="Clear Chat"
                            >
                                <Trash2 size={18} />
                            </button>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="text-gray-500 hover:text-gray-800"
                                title="Close"
                            >
                                <X size={18} />
                            </button>
                        </div>
                    </div>
                    <CardContent className="p-3 flex-1 overflow-hidden">
                        <ScrollArea className="h-full pr-2">
                            {messages.map((m, i) => (
                                <div
                                    key={i}
                                    className={`mb-4 text-sm ${m.role === 'user' ? 'text-right' : 'text-left'}`}
                                >
                                    <div
                                        className={`inline-block p-2 rounded-xl max-w-[80%] ${
                                            m.role === 'user'
                                                ? 'bg-neutral-900 text-white'
                                                : 'bg-muted'
                                        }`}
                                    >
                                        <strong>{m.role === 'user' ? 'You' : 'Vault Bot'}</strong>: {m.content}
                                    </div>
                                </div>
                            ))}
                            {loading && (
                                <div className="mb-4 text-left">
                                    <div className="inline-block p-2 rounded-xl max-w-[80%] bg-muted animate-pulse">
                                        <span className="block h-4 w-32 rounded"></span>
                                    </div>
                                </div>
                            )}
                            <div ref={bottomRef} />
                        </ScrollArea>
                    </CardContent>
                    <Separator />
                    <form onSubmit={sendMessage} className="flex items-center gap-2 p-3 border-t">
                        <Input
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            placeholder="Type your question…"
                            className="flex-1 text-sm"
                        />
                        <Button type="submit" size="sm" disabled={loading}>
                            Send
                        </Button>
                    </form>
                </Card>
            )}
        </div>
    )
}