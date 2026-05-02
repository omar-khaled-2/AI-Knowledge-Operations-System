export type WSEventType = 'document.status';

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

export interface ServerConfig {
  port: number;
  redisUrl: string;
  redisPassword?: string;
  betterAuthSecret: string;
  frontendUrl: string;
  heartbeatInterval: number;
  nodeEnv: string;
}
