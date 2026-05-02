'use client'

import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import type {
  ConnectionStatus,
  WebSocketContextType,
  WSMessage,
} from '@/types/websocket'

const WebSocketContext = createContext<WebSocketContextType | null>(null)

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001/ws'
const HEARTBEAT_INTERVAL = 30000 // 30 seconds
const RECONNECTION_DELAY = 1000 // 1 second base
const RECONNECTION_DELAY_MAX = 30000 // 30 seconds max

function hasSessionCookie(): boolean {
  if (typeof document === 'undefined') return false
  return document.cookie
    .split(';')
    .some((cookie) => cookie.trim().startsWith('better-auth.session_token='))
}

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected')
  const [lastMessage, setLastMessage] = useState<WSMessage | null>(null)
  const socketRef = useRef<Socket | null>(null)
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null)

  const send = useCallback((message: WSMessage) => {
    const socket = socketRef.current
    if (socket?.connected) {
      socket.emit('message', message)
    } else {
      console.warn('[WebSocket] Cannot send message: socket not connected')
    }
  }, [])

  const disconnectSocket = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current)
      heartbeatRef.current = null
    }

    const socket = socketRef.current
    if (socket) {
      socket.removeAllListeners()
      socket.disconnect()
      socketRef.current = null
    }

    setConnectionStatus('disconnected')
  }, [])

  const connectSocket = useCallback(() => {
    // Don't connect if already connected or connecting
    if (socketRef.current?.connected || socketRef.current?.active) {
      return
    }

    // Don't connect without auth
    if (!hasSessionCookie()) {
      setConnectionStatus('disconnected')
      return
    }

    setConnectionStatus('connecting')

    const socket = io(WS_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: RECONNECTION_DELAY,
      reconnectionDelayMax: RECONNECTION_DELAY_MAX,
      randomizationFactor: 0.5,
    })

    socketRef.current = socket

    socket.on('connect', () => {
      console.log('[WebSocket] Connected')
      setConnectionStatus('connected')
    })

    socket.on('disconnect', (reason) => {
      console.log('[WebSocket] Disconnected:', reason)
      if (reason === 'io client disconnect') {
        // Intentional disconnect
        setConnectionStatus('disconnected')
      } else if (reason === 'io server disconnect') {
        // Server disconnected us, will try to reconnect
        setConnectionStatus('connecting')
      } else {
        // Transport error, etc.
        setConnectionStatus('connecting')
      }
    })

    socket.on('connect_error', (error) => {
      console.error('[WebSocket] Connection error:', error.message)
      setConnectionStatus('error')
    })

    socket.on('document.status', (message: WSMessage) => {
      console.log('[WebSocket] Received document.status:', message)
      setLastMessage(message)
    })

    // Heartbeat
    heartbeatRef.current = setInterval(() => {
      if (socket.connected) {
        socket.emit('ping')
      }
    }, HEARTBEAT_INTERVAL)
  }, [])

  useEffect(() => {
    // Initial connection attempt
    connectSocket()

    // Monitor auth cookie changes
    const checkCookieInterval = setInterval(() => {
      const hasAuth = hasSessionCookie()
      const socket = socketRef.current

      if (!hasAuth && socket?.connected) {
        console.log('[WebSocket] Auth cookie missing, disconnecting')
        disconnectSocket()
      } else if (hasAuth && !socket?.connected && !socket?.active) {
        console.log('[WebSocket] Auth cookie present, connecting')
        connectSocket()
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
