'use client'

import { useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { User, Bot, Loader2 } from 'lucide-react'
import type { ChatMessage, ChatSession } from '@/hooks/use-chat'
import { ChatSources } from './chat-sources'

interface ChatMessagesProps {
  messages: ChatMessage[]
  isLoading: boolean
  currentSession: ChatSession | null
}

export function ChatMessages({ messages, isLoading, currentSession }: ChatMessagesProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  if (!currentSession) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Bot className="w-12 h-12 text-[#9a9a9a] mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-[#0a0a0a] mb-2">
            Welcome to AI Chat
          </h3>
          <p className="text-sm text-[#6a6a6a] max-w-md">
            Start a new conversation or select an existing chat from the sidebar.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={scrollRef}
      className="h-full overflow-y-auto px-4 py-6 space-y-6"
    >
      {messages.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <p className="text-sm text-[#9a9a9a]">Send a message to start the conversation</p>
        </div>
      )}

      {messages.map((message) => (
        <div
          key={message.id}
          className={cn(
            'flex gap-3',
            message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
          )}
        >
          {/* Avatar */}
          <div
            className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
              message.role === 'user'
                ? 'bg-[#0a0a0a]'
                : 'bg-[#f5f0e0]'
            )}
          >
            {message.role === 'user' ? (
              <User className="w-4 h-4 text-white" />
            ) : (
              <Bot className="w-4 h-4 text-[#6a6a6a]" />
            )}
          </div>

          {/* Message Content */}
          <div
            className={cn(
              'max-w-[80%] space-y-2',
              message.role === 'user' ? 'items-end' : 'items-start'
            )}
          >
            <div
              className={cn(
                'rounded-2xl px-4 py-3',
                message.role === 'user'
                  ? 'bg-[#0a0a0a] text-white'
                  : 'bg-[#f5f0e0] text-[#0a0a0a]'
              )}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            </div>

            {/* Sources */}
            {message.sources && message.sources.length > 0 && (
              <ChatSources sources={message.sources} />
            )}

            {/* Timestamp */}
            <p className="text-xs text-[#9a9a9a] px-1">
              {message.timestamp.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
        </div>
      ))}

      {/* Loading indicator */}
      {isLoading && (
        <div className="flex gap-3">
          <div className="w-8 h-8 rounded-full bg-[#f5f0e0] flex items-center justify-center">
            <Bot className="w-4 h-4 text-[#6a6a6a]" />
          </div>
          <div className="bg-[#f5f0e0] rounded-2xl px-4 py-3">
            <Loader2 className="w-5 h-5 text-[#6a6a6a] animate-spin" />
          </div>
        </div>
      )}
    </div>
  )
}
