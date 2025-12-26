'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function UserSearch({ currentUserId }: { currentUserId: string }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ id: string; name: string; email: string }[]>([]);
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
    const res = await fetch('/api/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ participantIds: [currentUserId, userId] }),
    });
    if (res.ok) {
      const conversation = await res.json();
      router.push(`/conversations/${conversation.id}/${userId}`);
    }
  }

  return (
    <div className="h-full max-w-xl w-full mx-auto bg-secondary p-6 rounded-xl ">
      <Input
        placeholder="Search users to chat"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="mb-4 rounded-xl border border-secondary-muted bg-primary-light text-primary p-3 focus:ring-2 focus:ring-secondary focus:outline-none transition-all "
      />

      <ul className="divide-y divide-secondary-muted max-h-64 overflow-auto rounded-lg">
        {results.map((user) => (
          <li
            key={user.id}
            className="py-3 px-4 flex justify-between items-center hover:bg-primary-light rounded-lg transition-colors"
          >
            <div>
              <p className="font-semibold text-primary">{user.name || 'No Name'}</p>
              {/* <p className="text-sm text-secondary-muted">{user.email}</p> */}
            </div>
            <Button
              size="sm"
             
              onClick={() => startChatWith(user.id)}
            >
              Chat
            </Button>
          </li>
        ))}

        {results.length === 0 && query.trim() && (
          <li className="py-4 text-center text-secondary-muted">No users found</li>
        )}
      </ul>
    </div>
  );
}
