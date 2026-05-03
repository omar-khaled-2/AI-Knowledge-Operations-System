export type WSEventType = 'document.status' | 'chat.message' | 'message.created' | 'insight.generated'

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

export interface ChatMessagePayload {
  sessionId: string
  content: string
}

export interface MessageCreatedPayload {
  sessionId: string
  message: {
    id: string
    role: string
    content: string
    sources?: Array<{
      documentId: string
      title: string
      snippet: string
      score: number
    }>
    createdAt: string
  }
}

export type DocumentStatusMessage = WSMessage<'document.status', DocumentStatusPayload>
export type ChatMessageEvent = WSMessage<'chat.message', ChatMessagePayload>
export interface InsightGeneratedPayload {
  projectId: string
  sourceDocumentId: string
  newInsightsCount: number
  preview: Array<{
    type: string
    title: string
    confidence: number
  }>
}

export type MessageCreatedEvent = WSMessage<'message.created', MessageCreatedPayload>
export type InsightGeneratedEvent = WSMessage<'insight.generated', InsightGeneratedPayload>

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

export interface WebSocketContextType {
  connectionStatus: ConnectionStatus
  lastMessage: WSMessage | null
  send: (message: WSMessage) => void
}
