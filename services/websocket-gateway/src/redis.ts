import Redis from 'ioredis';
import type { ServerConfig } from './types';
import { logger } from './logger';

export class RedisClient {
  private publisher: Redis;
  private subscriber: Redis;
  private handlers: Map<string, (message: string) => void> = new Map();
  private isConnected: boolean = false;

  constructor(config: ServerConfig) {
    const redisOptions: Redis.RedisOptions = {
      password: config.redisPassword || undefined,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
    };

    this.publisher = new Redis(config.redisUrl, redisOptions);
    this.subscriber = new Redis(config.redisUrl, redisOptions);

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.publisher.on('error', (err) => {
      logger.error({ err }, 'Redis publisher error');
    });

    this.subscriber.on('error', (err) => {
      logger.error({ err }, 'Redis subscriber error');
    });

    this.subscriber.on('message', (channel: string, message: string) => {
      const handler = this.handlers.get(channel);
      if (handler) {
        try {
          handler(message);
        } catch (err) {
          logger.error({ err, channel }, 'Error handling Redis message');
        }
      }
    });

    this.publisher.on('connect', () => {
      logger.info('Redis publisher connected');
      this.isConnected = true;
    });

    this.subscriber.on('connect', () => {
      logger.info('Redis subscriber connected');
    });

    this.publisher.on('disconnect', () => {
      logger.info('Redis publisher disconnected');
      this.isConnected = false;
    });

    this.subscriber.on('disconnect', () => {
      logger.info('Redis subscriber disconnected');
    });
  }

  async publish(channel: string, message: string): Promise<void> {
    if (!this.isConnected) {
      logger.warn('Redis not connected, cannot publish');
      return;
    }
    await this.publisher.publish(channel, message);
  }

  async subscribe(channel: string, handler: (message: string) => void): Promise<void> {
    this.handlers.set(channel, handler);
    await this.subscriber.subscribe(channel);
    logger.info({ channel }, 'Subscribed to Redis channel');
  }

  async unsubscribe(channel: string): Promise<void> {
    this.handlers.delete(channel);
    await this.subscriber.unsubscribe(channel);
    logger.info({ channel }, 'Unsubscribed from Redis channel');
  }

  async disconnect(): Promise<void> {
    await this.subscriber.quit();
    await this.publisher.quit();
    logger.info('Redis connections closed');
  }
}
