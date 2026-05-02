import Redis from 'ioredis';
import type { ServerConfig } from './types';

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
      console.error('Redis publisher error:', err.message);
    });

    this.subscriber.on('error', (err) => {
      console.error('Redis subscriber error:', err.message);
    });

    this.subscriber.on('message', (channel: string, message: string) => {
      const handler = this.handlers.get(channel);
      if (handler) {
        try {
          handler(message);
        } catch (err) {
          console.error(`Error handling message on channel ${channel}:`, err);
        }
      }
    });

    this.publisher.on('connect', () => {
      console.log('Redis publisher connected');
      this.isConnected = true;
    });

    this.subscriber.on('connect', () => {
      console.log('Redis subscriber connected');
    });

    this.publisher.on('disconnect', () => {
      console.log('Redis publisher disconnected');
      this.isConnected = false;
    });

    this.subscriber.on('disconnect', () => {
      console.log('Redis subscriber disconnected');
    });
  }

  async publish(channel: string, message: string): Promise<void> {
    if (!this.isConnected) {
      console.warn('Redis not connected, cannot publish');
      return;
    }
    await this.publisher.publish(channel, message);
  }

  async subscribe(channel: string, handler: (message: string) => void): Promise<void> {
    this.handlers.set(channel, handler);
    await this.subscriber.subscribe(channel);
    console.log(`Subscribed to Redis channel: ${channel}`);
  }

  async unsubscribe(channel: string): Promise<void> {
    this.handlers.delete(channel);
    await this.subscriber.unsubscribe(channel);
    console.log(`Unsubscribed from Redis channel: ${channel}`);
  }

  async disconnect(): Promise<void> {
    await this.subscriber.quit();
    await this.publisher.quit();
    console.log('Redis connections closed');
  }
}
