'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, MessageSquare, User } from 'lucide-react';

export default function UserSearch({ currentUserId }: { currentUserId: string }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ id: string; name: string; email: string }[]>([]);
  const [starting, setStarting] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      const res = await fetch(`/api/user/search?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.filter((user: any) => user.id !== currentUserId));
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, currentUserId]);

  async function startChatWith(userId: string) {
    setStarting(userId);
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantIds: [currentUserId, userId] }),
      });
      if (res.ok) {
        const conversation = await res.json();
        router.push(`/chats/${conversation.id}`);
      }
    } finally {
      setStarting(null);
    }
  }

  return (
    <div className="w-full max-w-lg mx-auto">
      {/* Search input */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
        <Input
          placeholder="Search by name or email..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus-visible:ring-indigo-500 rounded-xl h-11"
          autoFocus
        />
      </div>

      {/* Results list */}
      <div className="rounded-xl border border-white/10 bg-[#111] overflow-hidden">
        {results.length > 0 ? (
          <ul className="divide-y divide-white/5">
            {results.map((user) => (
              <li
                key={user.id}
                className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-indigo-900 flex items-center justify-center flex-shrink-0">
                    <User className="h-4 w-4 text-indigo-300" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{user.name || 'Anonymous'}</p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => startChatWith(user.id)}
                  disabled={starting === user.id}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs gap-1.5 rounded-lg"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  {starting === user.id ? 'Opening...' : 'Chat'}
                </Button>
              </li>
            ))}
          </ul>
        ) : query.trim() ? (
          <div className="py-10 text-center text-gray-600 text-sm">
            No users found for &quot;{query}&quot;
          </div>
        ) : (
          <div className="py-10 text-center text-gray-700 text-sm">
            Start typing to search for users
          </div>
        )}
      </div>
    </div>
  );
}
