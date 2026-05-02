export type WSEventType = 'document.status'

export interface WSMessage<T extends WSEventType = WSEventType, P = unknown> {
  event: T
  version: '1.0'
  timestamp: string
  userId: string
  payload: P
}

export interface DocumentStatusPayload {
  documentId: string
  status: 'uploaded' | 'processing' | 'chunking' | 'embedding' | 'ready' | 'error'
  progress?: number
  error?: string
}

export type DocumentStatusMessage = WSMessage<'document.status', DocumentStatusPayload>

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

export interface WebSocketContextType {
  connectionStatus: ConnectionStatus
  lastMessage: WSMessage | null
  send: (message: WSMessage) => void
}
