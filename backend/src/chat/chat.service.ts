import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { RedisService } from '../websocket/redis.service';
import { MessagesService } from '../messages/messages.service';

interface ChatNotification {
  userId: string;
  sessionId: string;
  projectId: string | null;
}

@Injectable()
export class ChatService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly messagesService: MessagesService,
    private readonly redisService: RedisService,
  ) {}

  async onModuleInit() {
    await this.redisService.subscribe('chat:incoming', this.handleIncomingMessage.bind(this));
    this.logger.log('ChatService subscribed to chat:incoming');
  }

  async onModuleDestroy() {
    await this.redisService.unsubscribe('chat:incoming');
    this.logger.log('ChatService unsubscribed from chat:incoming');
  }

  private async handleIncomingMessage(message: string): Promise<void> {
    try {
      const data = JSON.parse(message) as ChatNotification;
      this.logger.debug(`Received chat:incoming for session ${data.sessionId}`);

      // Save user message
      await this.messagesService.create({
        sessionId: data.sessionId,
        userId: data.userId,
        role: 'user',
        content: data.message || '',
      });

      // Publish light notification to chat:process
      const notification = {
        userId: data.userId,
        sessionId: data.sessionId,
        projectId: data.projectId,
      };

      await this.redisService.publish('chat:process', JSON.stringify(notification));
      this.logger.debug(`Published chat:process notification for session ${data.sessionId}`);
    } catch (error) {
      this.logger.error(
        `Error handling incoming message: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
