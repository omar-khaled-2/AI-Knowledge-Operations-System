'use client'

import { useState, useRef, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Send, Loader2 } from 'lucide-react'

interface ChatInputProps {
  onSend: (content: string) => void
  isLoading: boolean
  disabled?: boolean
}

export function ChatInput({ onSend, isLoading, disabled = false }: ChatInputProps) {
  const [content, setContent] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSend = useCallback(() => {
    const trimmed = content.trim()
    if (!trimmed || isLoading || disabled) return

    onSend(trimmed)
    setContent('')

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }, [content, isLoading, disabled, onSend])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend]
  )

  const handleInput = useCallback(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
    }
  }, [])

  return (
    <div className="flex items-end gap-2 bg-white rounded-2xl border border-[#e5e5e5] p-2 shadow-sm">
      <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        onInput={handleInput}
        placeholder={disabled ?? false ? 'Select a chat to start messaging' : 'Type a message...'}
        disabled={disabled || isLoading}
        rows={1}
        className={cn(
          'flex-1 resize-none bg-transparent px-3 py-2 text-sm',
          'focus:outline-none min-h-[40px] max-h-[200px]',
          'placeholder:text-[#9a9a9a]',
          disabled && 'cursor-not-allowed opacity-50'
        )}
      />

      <button
        onClick={handleSend}
        disabled={!content.trim() || isLoading || disabled}
        className={cn(
          'p-2 rounded-xl transition-colors flex-shrink-0',
          'focus:outline-none focus:ring-2 focus:ring-[#0a0a0a]',
          content.trim() && !isLoading && !disabled
            ? 'bg-[#0a0a0a] text-white hover:bg-[#2a2a2a]'
            : 'bg-[#f5f0e0] text-[#9a9a9a] cursor-not-allowed'
        )}
      >
        {isLoading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Send className="w-5 h-5" />
        )}
      </button>
    </div>
  )
}
