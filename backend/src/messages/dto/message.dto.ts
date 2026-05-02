import { Exclude, Expose, Transform, Type } from 'class-transformer';
import { Types } from 'mongoose';

class SourceDto {
  documentId: string;
  title: string;
  snippet: string;
  score: number;
}

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

@Exclude()
export class MessageResponseDto {
  @Expose()
  id: string;

  @Expose()
  @Transform(({ value }) => {
    if (value instanceof Types.ObjectId) {
      return value.toString();
    }
    return value;
  })
  sessionId: string;

  @Expose()
  @Transform(({ value }) => {
    if (value instanceof Types.ObjectId) {
      return value.toString();
    }
    return value;
  })
  userId: string;

  @Expose()
  role: string;

  @Expose()
  content: string;

  @Expose()
  @Type(() => SourceDto)
  sources?: Array<{
    documentId: string;
    title: string;
    snippet: string;
    score: number;
  }>;

  @Expose()
  createdAt: Date;
}

export interface ListMessagesQueryDto {
  page?: number;
  limit?: number;
}
