'use client'

import { cn } from '@/lib/utils'
import { Plus, Trash2, MessageSquare, X } from 'lucide-react'
import type { ChatSession } from '@/hooks/use-chat'

interface ChatSidebarProps {
  sessions: ChatSession[]
  currentSession: ChatSession | null
  onCreateSession: () => void
  onSelectSession: (sessionId: string) => void
  onDeleteSession: (sessionId: string) => void
  isOpen: boolean
  onClose: () => void
}

export function ChatSidebar({
  sessions,
  currentSession,
  onCreateSession,
  onSelectSession,
  onDeleteSession,
  isOpen,
  onClose,
}: ChatSidebarProps) {
  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed lg:static inset-y-0 left-0 z-50 w-64 bg-[#faf5e8] border-r border-[#e5e5e5]',
          'flex flex-col transition-transform duration-300 ease-in-out',
          'lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#e5e5e5]">
          <h2 className="font-semibold text-[#0a0a0a]">Chat History</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={onCreateSession}
              className="p-2 rounded-lg hover:bg-[#f5f0e0] transition-colors"
              title="New chat"
            >
              <Plus className="w-5 h-5 text-[#6a6a6a]" />
            </button>
            <button
              onClick={onClose}
              className="lg:hidden p-2 rounded-lg hover:bg-[#f5f0e0] transition-colors"
            >
              <X className="w-5 h-5 text-[#6a6a6a]" />
            </button>
          </div>
        </div>

        {/* Session List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {sessions.length === 0 ? (
            <div className="p-4 text-center text-sm text-[#9a9a9a]">
              No chats yet. Start a new conversation!
            </div>
          ) : (
            sessions.map((session) => (
              <div
                key={session.id}
                onClick={() => onSelectSession(session.id)}
                className={cn(
                  'group flex items-center gap-3 p-3 rounded-xl cursor-pointer',
                  'transition-colors min-h-[52px]',
                  currentSession?.id === session.id
                    ? 'bg-[#f5f0e0] text-[#0a0a0a]'
                    : 'hover:bg-[#f5f0e0]/50 text-[#6a6a6a]'
                )}
              >
                <MessageSquare className="w-4 h-4 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {session.title}
                  </p>
                  <p className="text-xs text-[#9a9a9a]">
                    {session.messageCount} messages
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onDeleteSession(session.id)
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-100 transition-all"
                  title="Delete chat"
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </button>
              </div>
            ))
          )}
        </div>
      </aside>
    </>
  )
}
