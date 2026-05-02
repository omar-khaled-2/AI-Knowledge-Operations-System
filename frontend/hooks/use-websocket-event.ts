'use client'

import { useMemo } from 'react'
import { useWebSocket } from '@/providers/websocket-provider'
import type { DocumentStatusPayload, WSMessage } from '@/types/websocket'

/**
 * Subscribe to a specific WebSocket event type.
 * Returns the latest payload for the given event type.
 */
export function useWebSocketEvent<T = unknown>(eventType: string): T | null {
  const { lastMessage } = useWebSocket()

  const payload = useMemo(() => {
    if (!lastMessage || lastMessage.event !== eventType) {
      return null
    }
    return lastMessage.payload as T
  }, [lastMessage, eventType])

  return payload
}

/**
 * Subscribe to document status updates for a specific document.
 * Returns the latest status payload filtered by documentId.
 */
export function useDocumentStatus(documentId: string): DocumentStatusPayload | null {
  const { lastMessage } = useWebSocket()

  const status = useMemo(() => {
    if (!lastMessage || lastMessage.event !== 'document.status') {
      return null
    }

    const payload = lastMessage.payload as DocumentStatusPayload
    if (payload.documentId !== documentId) {
      return null
    }

    return payload
  }, [lastMessage, documentId])

  return status
}
