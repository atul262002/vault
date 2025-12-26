'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';

interface Message {
  id: string;
  senderId: string;
  content: string;
  createdAt: string;
}

interface ChatProps {
  conversationId: string;
  currentUserId: string;
  recieverId: string;
}

export default function Chat({ conversationId, currentUserId, recieverId }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchMessages = async () => {
      const res = await fetch(`/api/conversations/${conversationId}/messages`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    };
    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [conversationId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    await fetch(`/api/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: newMessage,
        senderId: currentUserId,
        receiverId: recieverId,
      }),
    });

    setNewMessage('');
  };

  return (
    <div className="flex flex-col h-full w-full  mx-auto bg-secondary p-4 sm:p-6 md:p-8 text-secondary shadow-lg ">
      <ScrollArea
        ref={scrollRef}
        className="flex-1 mb-4 overflow-y-auto rounded-xl bg-primary-light p-4 sm:p-6 shadow-inner"
        style={{ minHeight: '400px', maxHeight: '600px' }}
      >
        <div className="flex flex-col gap-2">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`relative flex max-w-[75%] p-4 text-sm sm:text-base break-words rounded-xl shadow ${msg.senderId === currentUserId
                  ? 'ml-auto bg-primary-foreground text-primary'
                  : 'mr-auto bg-secondary-foreground text-primary-dark'
                }`}
            >
              <span
                className={`absolute w-0 h-0 bottom-0 ${msg.senderId === currentUserId ? 'right-0 translate-x-1/2' : 'left-0 -translate-x-1/2'
                  } border-[10px] border-transparent ${msg.senderId === currentUserId
                    ? 'border-t-primary-foreground border-b-0 border-l-primary-foreground/0 border-r-primary-foreground/0'
                    : 'border-t-secondary-foreground border-b-0 border-l-secondary-foreground/0 border-r-secondary-foreground/0'
                  }`}
              ></span>

              <div className="flex flex-col">
                <span>{msg.content}</span>
                <span className="text-xs mt-2 text-secondary-muted text-right">
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="flex gap-3 items-center w-full max-w-5xl mx-auto sticky bottom-0 bg-secondary p-2 sm:p-3 rounded-t-xl shadow-inner">
        <Input
          placeholder="Type your message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          className="flex-1 rounded-xl border border-secondary-muted bg-primary-light text-primary p-3 focus:ring-2 focus:ring-secondary focus:outline-none transition-all"
        />
        <Button
          onClick={sendMessage}

          
        >
          Send
        </Button>
      </div>
    </div>

  );
}
