'use client'

import { useState } from 'react'
import { ChatSidebar } from './chat-sidebar'
import { ChatMessages } from './chat-messages'
import { ChatInput } from './chat-input'
import type { ChatMessage, ChatSession } from '@/hooks/use-chat'

interface ChatContainerProps {
  messages: ChatMessage[]
  isLoading: boolean
  error: string | null
  sendMessage: (content: string) => void
  sessions: ChatSession[]
  currentSession: ChatSession | null
  createSession: () => void
  selectSession: (sessionId: string) => void
  deleteSession: (sessionId: string) => void
  projectId: string
}

export function ChatContainer({
  messages,
  isLoading,
  error,
  sendMessage,
  sessions,
  currentSession,
  createSession,
  selectSession,
  deleteSession,
}: ChatContainerProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-full bg-[#fffaf0]">
      {/* Sidebar */}
      <ChatSidebar
        sessions={sessions}
        currentSession={currentSession}
        onCreateSession={createSession}
        onSelectSession={selectSession}
        onDeleteSession={deleteSession}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile sidebar toggle */}
        <button
          onClick={() => setSidebarOpen(true)}
          className="lg:hidden p-4 text-[#6a6a6a] hover:text-[#3a3a3a]"
        >
          <span className="sr-only">Open sidebar</span>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Messages */}
        <div className="flex-1 overflow-hidden">
          <ChatMessages
            messages={messages}
            isLoading={isLoading}
            currentSession={currentSession}
          />
        </div>

        {/* Error */}
        {error && (
          <div className="px-4 py-2 bg-red-50 border-t border-red-100">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Input */}
        <div className="border-t border-[#e5e5e5] p-4">
          <ChatInput
            onSend={sendMessage}
            isLoading={isLoading}
            disabled={!currentSession}
          />
        </div>
      </div>
    </div>
  )
}
