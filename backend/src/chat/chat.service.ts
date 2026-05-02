import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../websocket/redis.service';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(private readonly redisService: RedisService) {}

  async publishProcessNotification(
    userId: string,
    sessionId: string,
    projectId: string | null,
  ): Promise<void> {
    const notification = {
      userId,
      sessionId,
      projectId,
    };

    try {
      await this.redisService.publish('chat:process', JSON.stringify(notification));
      this.logger.debug(`Published chat:process for session ${sessionId}`);
    } catch (error) {
      this.logger.error(
        `Failed to publish chat:process: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }
}
