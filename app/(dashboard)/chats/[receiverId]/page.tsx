'use client'

import Chat from '@/components/chatComponents/chat'
import React from 'react'
import { useParams } from 'next/navigation'

const Page = () => {
  const params = useParams();
  const receiverId = params.receiverId as string;
  console.log(receiverId)
  return (
    <div>
      <Chat receiverId={receiverId} />
    </div>
  )
}

export default Page;
