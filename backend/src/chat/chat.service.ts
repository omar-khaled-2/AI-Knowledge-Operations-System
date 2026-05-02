import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { RedisService } from '../websocket/redis.service';
import { WebSocketPublisher } from '../websocket/websocket-publisher.service';
import { MessagesService } from '../messages/messages.service';
import { SessionsService } from '../sessions/sessions.service';

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
    private readonly messagesService: MessagesService,
    private readonly sessionsService: SessionsService,
    private readonly redisService: RedisService,
    private readonly wsPublisher: WebSocketPublisher,
  ) {}

  async onModuleInit() {
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
      await this.messagesService.create({
        sessionId: data.sessionId,
        userId: data.userId,
        role: 'user',
        content: data.message,
      });

      // Fetch chat history
      const { messages: history } = await this.messagesService.findBySession(data.sessionId);

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

        await this.messagesService.create({
          sessionId,
          userId,
          role: 'assistant',
          content: fullResponse,
          sources,
        });

        // Update session message count
        await this.sessionsService.incrementMessageCount(sessionId, userId);

        this.logger.log(`Saved assistant response for session ${sessionId}`);
      }
    } catch (error) {
      this.logger.error(
        `Error handling response chunk: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
