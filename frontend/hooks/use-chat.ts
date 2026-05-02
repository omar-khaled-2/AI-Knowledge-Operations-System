'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useWebSocket } from '@/providers/websocket-provider'
import type { MessageCreatedPayload, WSMessage } from '@/types/websocket'

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

  // Handle incoming message.created events
  useEffect(() => {
    if (!lastMessage || lastMessage.event !== 'message.created') {
      return
    }

    const payload = lastMessage.payload as MessageCreatedPayload
    const { sessionId, message } = payload

    if (!currentSession || currentSession.id !== sessionId) {
      return
    }

    // Add the new message to the list
    const newMessage: ChatMessage = {
      id: message.id,
      role: message.role as 'user' | 'assistant' | 'system',
      content: message.content,
      sources: message.sources,
      timestamp: new Date(message.createdAt),
    }

    setMessages((prev) => [...prev, newMessage])
    
    // If it's an assistant message, stop loading
    if (message.role === 'assistant') {
      setIsLoading(false)
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

      // Add user message locally (optimistic)
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
