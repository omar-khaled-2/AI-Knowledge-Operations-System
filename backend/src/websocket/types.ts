export type WSEventType = 'document.status' | 'chat.message' | 'chat.response' | 'message.created';

export interface WSMessage<T extends WSEventType = WSEventType, P = unknown> {
  event: T;
  version: '1.0';
  timestamp: string;
  userId: string;
  payload: P;
}

export interface DocumentStatusPayload {
  documentId: string;
  status: 'uploaded' | 'processing' | 'chunking' | 'embedding' | 'ready' | 'error';
  progress?: number;
  error?: string;
}

export interface ChatMessagePayload {
  sessionId: string;
  content: string;
}

export interface ChatResponsePayload {
  sessionId: string;
  chunk: string;
  done: boolean;
  sources?: Array<{
    documentId: string;
    title: string;
    snippet: string;
    score: number;
  }>;
}

export interface MessageCreatedPayload {
  sessionId: string;
  message: {
    id: string;
    role: string;
    content: string;
    sources?: Array<{
      documentId: string;
      title: string;
      snippet: string;
      score: number;
    }>;
    createdAt: Date;
  };
}

export type DocumentStatusMessage = WSMessage<'document.status', DocumentStatusPayload>;
export type ChatMessage = WSMessage<'chat.message', ChatMessagePayload>;
export type ChatResponseMessage = WSMessage<'chat.response', ChatResponsePayload>;
export type MessageCreatedMessage = WSMessage<'message.created', MessageCreatedPayload>;

export interface SocketData {
  userId: string;
  socketId: string;
  connectedAt: string;
}
