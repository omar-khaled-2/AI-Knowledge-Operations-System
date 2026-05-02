'use client'

import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import type {
  ConnectionStatus,
  WebSocketContextType,
  WSMessage,
} from '@/types/websocket'

const WebSocketContext = createContext<WebSocketContextType | null>(null)

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3002'
const HEARTBEAT_INTERVAL = 30000 // 30 seconds
const RECONNECTION_DELAY_BASE = 1000 // 1 second base
const RECONNECTION_DELAY_MAX = 30000 // 30 seconds max

function hasSessionCookie(): boolean {
  if (typeof document === 'undefined') return false
  return document.cookie
    .split(';')
    .some((cookie) => cookie.trim().startsWith('better-auth.session_token='))
}

function getReconnectDelay(attempt: number): number {
  const delay = Math.min(
    RECONNECTION_DELAY_BASE * Math.pow(2, attempt),
    RECONNECTION_DELAY_MAX
  )
  // Add jitter to prevent thundering herd
  return delay * (0.5 + Math.random() * 0.5)
}

async function fetchTicket(): Promise<string | null> {
  try {
    const response = await fetch('/api/ws/ticket', {
      method: 'POST',
      credentials: 'include', // Send cookies for auth
    })

    if (!response.ok) {
      if (response.status === 401) {
        console.error('[WebSocket] Unauthorized: user not authenticated')
      } else {
        console.error('[WebSocket] Failed to fetch ticket:', response.status, response.statusText)
      }
      return null
    }

    const data = await response.json()
    return data.ticket ?? null
  } catch (error) {
    console.error('[WebSocket] Error fetching ticket:', error)
    return null
  }
}

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected')
  const [lastMessage, setLastMessage] = useState<WSMessage | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reconnectAttemptRef = useRef(0)
  const isIntentionalCloseRef = useRef(false)

  const clearHeartbeat = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current)
      heartbeatRef.current = null
    }
  }, [])

  const clearReconnectTimeout = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
  }, [])

  const disconnectSocket = useCallback(() => {
    clearHeartbeat()
    clearReconnectTimeout()
    isIntentionalCloseRef.current = true

    const ws = wsRef.current
    if (ws) {
      ws.close()
      wsRef.current = null
    }

    reconnectAttemptRef.current = 0
    setConnectionStatus('disconnected')
  }, [clearHeartbeat, clearReconnectTimeout])

  const connectSocket = useCallback(async () => {
    // Don't connect if already connected or connecting
    const ws = wsRef.current
    if (ws?.readyState === WebSocket.OPEN || ws?.readyState === WebSocket.CONNECTING) {
      return
    }

    // Don't connect without auth
    if (!hasSessionCookie()) {
      setConnectionStatus('disconnected')
      return
    }

    setConnectionStatus('connecting')
    isIntentionalCloseRef.current = false

    // Fetch ticket from backend (one-time use, get fresh ticket each time)
    const ticket = await fetchTicket()
    if (!ticket) {
      setConnectionStatus('error')
      return
    }

    try {
      const wsUrl = `${WS_URL}?ticket=${encodeURIComponent(ticket)}`
      const socket = new WebSocket(wsUrl)
      wsRef.current = socket

      socket.onopen = () => {
        console.log('[WebSocket] Connected')
        reconnectAttemptRef.current = 0
        setConnectionStatus('connected')

        // Start heartbeat
        heartbeatRef.current = setInterval(() => {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ event: 'ping', version: '1.0', timestamp: new Date().toISOString(), userId: '', payload: {} }))
          }
        }, HEARTBEAT_INTERVAL)
      }

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as WSMessage
          
          // Handle pong response
          if (data.event === 'pong') {
            return
          }

          console.log('[WebSocket] Received message:', data)
          setLastMessage(data)
        } catch (error) {
          console.error('[WebSocket] Failed to parse message:', error)
        }
      }

      socket.onclose = () => {
        console.log('[WebSocket] Connection closed')
        clearHeartbeat()
        wsRef.current = null

        if (isIntentionalCloseRef.current) {
          setConnectionStatus('disconnected')
          return
        }

        // Attempt reconnection with exponential backoff
        setConnectionStatus('connecting')
        const delay = getReconnectDelay(reconnectAttemptRef.current)
        console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${reconnectAttemptRef.current + 1})`)
        
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectAttemptRef.current += 1
          connectSocket().catch((error) => {
            console.error('[WebSocket] Reconnection failed:', error)
          })
        }, delay)
      }

      socket.onerror = (error) => {
        console.error('[WebSocket] Connection error:', error)
        setConnectionStatus('error')
      }
    } catch (error) {
      console.error('[WebSocket] Failed to create connection:', error)
      setConnectionStatus('error')
    }
  }, [clearHeartbeat, clearReconnectTimeout])

  const send = useCallback((message: WSMessage) => {
    const ws = wsRef.current
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message))
    } else {
      console.warn('[WebSocket] Cannot send message: socket not connected')
    }
  }, [])

  useEffect(() => {
    // Initial connection attempt
    connectSocket().catch((error) => {
      console.error('[WebSocket] Initial connection failed:', error)
    })

    // Monitor auth cookie changes
    const checkCookieInterval = setInterval(() => {
      const hasAuth = hasSessionCookie()
      const ws = wsRef.current
      const isConnected = ws?.readyState === WebSocket.OPEN
      const isConnecting = ws?.readyState === WebSocket.CONNECTING

      if (!hasAuth && isConnected) {
        console.log('[WebSocket] Auth cookie missing, disconnecting')
        disconnectSocket()
      } else if (hasAuth && !isConnected && !isConnecting) {
        console.log('[WebSocket] Auth cookie present, connecting')
        connectSocket().catch((error) => {
          console.error('[WebSocket] Connection failed:', error)
        })
      }
    }, 5000)

    return () => {
      clearInterval(checkCookieInterval)
      disconnectSocket()
    }
  }, [connectSocket, disconnectSocket])

  const value: WebSocketContextType = {
    connectionStatus,
    lastMessage,
    send,
  }

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  )
}

export function useWebSocket(): WebSocketContextType {
  const context = useContext(WebSocketContext)
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider')
  }
  return context
}
