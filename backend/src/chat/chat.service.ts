import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { RedisService } from '../websocket/redis.service';
import { WebSocketPublisher } from '../websocket/websocket-publisher.service';
import { ChatMessage, ChatMessageDocument } from './schemas/chat-message.schema';
import { Session, SessionDocument } from '../sessions/schemas/session.schema';

interface ChatProcessMessage {
  userId: string;
  sessionId: string;
  message: string;
  history: Array<{ role: string; content: string }>;
  projectId: string | null;
}

interface ChatResponseChunk {
  userId: string;
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

@Injectable()
export class ChatService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ChatService.name);
  private responseBuffer = new Map<string, string>();

  constructor(
    @InjectModel(ChatMessage.name) private chatMessageModel: Model<ChatMessageDocument>,
    @InjectModel(Session.name) private sessionModel: Model<SessionDocument>,
    private readonly redisService: RedisService,
    private readonly wsPublisher: WebSocketPublisher,
  ) {}

  async onModuleInit() {
    // Subscribe to chat:incoming and chat:response channels
    await this.redisService.subscribe('chat:incoming', this.handleIncomingMessage.bind(this));
    await this.redisService.subscribe('chat:response', this.handleResponseChunk.bind(this));
    this.logger.log('ChatService subscribed to Redis channels');
  }

  async onModuleDestroy() {
    await this.redisService.unsubscribe('chat:incoming');
    await this.redisService.unsubscribe('chat:response');
    this.logger.log('ChatService unsubscribed from Redis channels');
  }

  private async handleIncomingMessage(message: string): Promise<void> {
    try {
      const data = JSON.parse(message) as ChatProcessMessage;
      this.logger.debug(`Received chat:incoming for session ${data.sessionId}`);

      // Save user message
      await this.saveMessage(data.sessionId, data.userId, 'user', data.message);

      // Fetch chat history
      const history = await this.getChatHistory(data.sessionId);

      // Publish to chat:process for the chat service
      const processMessage = {
        userId: data.userId,
        sessionId: data.sessionId,
        message: data.message,
        history: history.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        projectId: data.projectId,
      };

      await this.redisService.publish('chat:process', JSON.stringify(processMessage));
      this.logger.debug(`Published chat:process for session ${data.sessionId}`);
    } catch (error) {
      this.logger.error(
        `Error handling incoming message: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async handleResponseChunk(message: string): Promise<void> {
    try {
      const data = JSON.parse(message) as ChatResponseChunk;
      const { sessionId, userId, chunk, done, sources } = data;

      // Buffer the response
      if (!this.responseBuffer.has(sessionId)) {
        this.responseBuffer.set(sessionId, '');
      }

      if (chunk) {
        const current = this.responseBuffer.get(sessionId) || '';
        this.responseBuffer.set(sessionId, current + chunk);
      }

      // Forward chunk to user via WebSocket
      await this.wsPublisher.sendToUser(userId, {
        event: 'chat.response',
        version: '1.0',
        timestamp: new Date().toISOString(),
        userId,
        payload: {
          sessionId,
          chunk,
          done,
          sources,
        },
      });

      // If done, save the complete message
      if (done) {
        const fullResponse = this.responseBuffer.get(sessionId) || '';
        this.responseBuffer.delete(sessionId);

        await this.saveMessage(sessionId, userId, 'assistant', fullResponse, sources);
        this.logger.log(`Saved assistant response for session ${sessionId}`);
      }
    } catch (error) {
      this.logger.error(
        `Error handling response chunk: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async saveMessage(
    sessionId: string,
    userId: string,
    role: 'user' | 'assistant' | 'system',
    content: string,
    sources?: Array<{ documentId: string; title: string; snippet: string; score: number }>,
  ): Promise<void> {
    const message = new this.chatMessageModel({
      sessionId: new Types.ObjectId(sessionId),
      userId: new Types.ObjectId(userId),
      role,
      content,
      sources,
    });

    await message.save();

    // Update session message count and preview
    const updateData: Record<string, unknown> = { $inc: { messageCount: 1 } };
    if (role === 'user') {
      updateData.$set = { preview: content.substring(0, 100) };
    }

    await this.sessionModel.findByIdAndUpdate(sessionId, updateData);
  }

  private async getChatHistory(
    sessionId: string,
  ): Promise<Array<{ role: string; content: string }>> {
    const messages = await this.chatMessageModel
      .find({ sessionId: new Types.ObjectId(sessionId) })
      .sort({ createdAt: 1 })
      .limit(50)
      .select('role content')
      .lean()
      .exec();

    return messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));
  }
}
