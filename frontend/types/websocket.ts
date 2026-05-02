export type WSEventType = 'document.status' | 'ping' | 'pong'

export interface WSMessage<T extends WSEventType = WSEventType, P = unknown> {
  event: T
  version: '1.0'
  timestamp: string
  userId: string
  payload: P
}

export interface DocumentStatusPayload {
  documentId: string
  status: 'processing' | 'processed' | 'embedded' | 'error'
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
