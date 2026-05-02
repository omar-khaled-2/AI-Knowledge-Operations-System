export interface CreateMessageDto {
  sessionId: string;
  userId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  sources?: Array<{
    documentId: string;
    title: string;
    snippet: string;
    score: number;
  }>;
}

export interface MessageResponseDto {
  id: string;
  sessionId: string;
  userId: string;
  role: string;
  content: string;
  sources?: Array<{
    documentId: string;
    title: string;
    snippet: string;
    score: number;
  }>;
  createdAt: Date;
}

export interface ListMessagesQueryDto {
  page?: number;
  limit?: number;
}
