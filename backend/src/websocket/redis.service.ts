import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis, { RedisOptions } from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private publisher: Redis;
  private subscriber: Redis;
  private handlers = new Map<string, (message: string) => void>();

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const redisUrl = this.configService.get<string>('app.redisUrl');
    const redisPassword = this.configService.get<string>('app.redisPassword');

    const redisOptions: RedisOptions = {
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        this.logger.warn(`Redis connection attempt ${times}, retrying in ${delay}ms`);
        return delay;
      },
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      ...(redisPassword ? { password: redisPassword } : {}),
    };

    this.publisher = new Redis(redisUrl, redisOptions);
    this.subscriber = new Redis(redisUrl, redisOptions);

    this.publisher.on('connect', () => {
      this.logger.log('Redis publisher connected');
    });

    this.publisher.on('error', (err) => {
      this.logger.error('Redis publisher error', err.message);
    });

    this.subscriber.on('connect', () => {
      this.logger.log('Redis subscriber connected');
    });

    this.subscriber.on('error', (err) => {
      this.logger.error('Redis subscriber error', err.message);
    });

    this.subscriber.on('message', (channel: string, message: string) => {
      const handler = this.handlers.get(channel);
      if (handler) {
        try {
          handler(message);
        } catch (err) {
          this.logger.error(`Error handling message on channel ${channel}: ${err instanceof Error ? err.message : String(err)}`);
        }
      } else {
        this.logger.warn(`No handler registered for channel: ${channel}`);
      }
    });
  }

  onModuleDestroy() {
    this.logger.log('Disconnecting from Redis...');
    this.publisher?.disconnect();
    this.subscriber?.disconnect();
    this.handlers.clear();
    this.logger.log('Redis connections closed');
  }

  async publish(channel: string, message: string): Promise<void> {
    try {
      await this.publisher.publish(channel, message);
    } catch (error) {
      this.logger.error(
        `Failed to publish to channel ${channel}: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  async subscribe(channel: string, handler: (message: string) => void): Promise<void> {
    if (this.handlers.has(channel)) {
      this.logger.warn(`Already subscribed to channel: ${channel}, replacing handler`);
    }
    this.handlers.set(channel, handler);
    await this.subscriber.subscribe(channel);
    this.logger.log(`Subscribed to channel: ${channel}`);
  }

  async unsubscribe(channel: string): Promise<void> {
    this.handlers.delete(channel);
    await this.subscriber.unsubscribe(channel);
    this.logger.log(`Unsubscribed from channel: ${channel}`);
  }
}
