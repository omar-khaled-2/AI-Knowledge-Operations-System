import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from './redis.service';
import { WSMessage, WSEventType } from './types';

@Injectable()
export class WebSocketPublisher {
  private readonly logger = new Logger(WebSocketPublisher.name);

  constructor(private readonly redisService: RedisService) {}

  async sendToUser<T extends WSEventType, P>(
    userId: string,
    event: WSMessage<T, P>,
  ): Promise<void> {
    const channel = `ws:user:${userId}`;
    const message = JSON.stringify(event);

    try {
      await this.redisService.publish(channel, message);
      this.logger.debug(`Published event to ${channel}`, { event: event.event });
    } catch (error) {
      this.logger.error(
        `Failed to publish event to ${channel}`,
        error instanceof Error ? error.message : String(error),
      );
    }
  }
}
