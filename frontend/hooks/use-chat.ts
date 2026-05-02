'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useWebSocket } from '@/providers/websocket-provider'
import type { ChatResponsePayload, WSMessage } from '@/types/websocket'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  sources?: Array<{
    documentId: string
    title: string
    snippet: string
    score: number
  }>
  timestamp: Date
}

export interface ChatSession {
  id: string
  title: string
  messageCount: number
  createdAt: Date
  updatedAt: Date
}

interface UseChatReturn {
  messages: ChatMessage[]
  isLoading: boolean
  error: string | null
  sendMessage: (content: string) => void
  sessions: ChatSession[]
  currentSession: ChatSession | null
  createSession: () => void
  selectSession: (sessionId: string) => void
  deleteSession: (sessionId: string) => void
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 15)
}

export function useChat(projectId?: string): UseChatReturn {
  const { send, lastMessage } = useWebSocket()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null)
  const responseBufferRef = useRef('')

  // Handle incoming chat response messages
  useEffect(() => {
    if (!lastMessage || lastMessage.event !== 'chat.response') {
      return
    }

    const payload = lastMessage.payload as ChatResponsePayload
    const { sessionId, chunk, done, sources } = payload

    if (!currentSession || currentSession.id !== sessionId) {
      return
    }

    if (chunk) {
      responseBufferRef.current += chunk
      
      // Update the last assistant message or create a new one
      setMessages((prev) => {
        const lastMsg = prev[prev.length - 1]
        if (lastMsg && lastMsg.role === 'assistant' && !lastMsg.sources) {
          // Update existing assistant message
          return [
            ...prev.slice(0, -1),
            { ...lastMsg, content: responseBufferRef.current },
          ]
        }
        // Create new assistant message
        return [
          ...prev,
          {
            id: generateId(),
            role: 'assistant',
            content: responseBufferRef.current,
            timestamp: new Date(),
          },
        ]
      })
    }

    if (done) {
      setIsLoading(false)
      
      if (sources) {
        setMessages((prev) => {
          const lastMsg = prev[prev.length - 1]
          if (lastMsg && lastMsg.role === 'assistant') {
            return [
              ...prev.slice(0, -1),
              { ...lastMsg, sources },
            ]
          }
          return prev
        })
      }

      responseBufferRef.current = ''
    }
  }, [lastMessage, currentSession])

  const sendMessage = useCallback(
    (content: string) => {
      if (!currentSession) {
        setError('No active session')
        return
      }

      setError(null)
      setIsLoading(true)

      // Add user message locally
      const userMessage: ChatMessage = {
        id: generateId(),
        role: 'user',
        content,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, userMessage])

      // Send via WebSocket
      const wsMessage: WSMessage = {
        event: 'chat:message',
        version: '1.0',
        timestamp: new Date().toISOString(),
        userId: '',
        payload: {
          sessionId: currentSession.id,
          content,
        },
      }

      send(wsMessage)
    },
    [currentSession, send]
  )

  const createSession = useCallback(() => {
    const newSession: ChatSession = {
      id: generateId(),
      title: 'New Chat',
      messageCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    setSessions((prev) => [newSession, ...prev])
    setCurrentSession(newSession)
    setMessages([])
    setError(null)
  }, [])

  const selectSession = useCallback(async (sessionId: string) => {
    const session = sessions.find((s) => s.id === sessionId)
    if (!session) return

    setCurrentSession(session)
    setError(null)
    responseBufferRef.current = ''

    try {
      // Fetch historical messages from REST API
      const response = await fetch(`/api/v1/chat/sessions/${sessionId}/messages?limit=50`)
      if (!response.ok) {
        throw new Error('Failed to load messages')
      }

      const data = await response.json()
      const historicalMessages: ChatMessage[] = data.messages.map((msg: any) => ({
        id: msg.id,
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content,
        sources: msg.sources,
        timestamp: new Date(msg.createdAt),
      }))

      setMessages(historicalMessages)
    } catch (err) {
      console.error('Failed to load chat history:', err)
      setError('Failed to load chat history')
      setMessages([])
    }
  }, [sessions])

  const deleteSession = useCallback((sessionId: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== sessionId))
    
    if (currentSession?.id === sessionId) {
      setCurrentSession(null)
      setMessages([])
    }
  }, [currentSession])

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    sessions,
    currentSession,
    createSession,
    selectSession,
    deleteSession,
  }
}
