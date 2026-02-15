'use client';

import Chat from '@/components/chatComponents/chat';
import React from 'react';
import { useParams } from 'next/navigation';

const ConversationPage = () => {
    const params = useParams();
    const conversationId = params.conversationId as string;

    return (
        <div className="h-full w-full">
            <Chat conversationId={conversationId} />
        </div>
    );
};

export default ConversationPage;
