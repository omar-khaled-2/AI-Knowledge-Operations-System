'use client'

import { useChat } from '@/hooks/use-chat'
import { ChatContainer } from '@/components/chat/chat-container'

interface ChatPageProps {
  params: {
    projectId: string
  }
}

export default function ChatPage({ params }: ChatPageProps) {
  const chat = useChat(params.projectId)

  return (
    <div className="h-[calc(100vh-4rem)]">
      <ChatContainer {...chat} projectId={params.projectId} />
    </div>
  )
}
