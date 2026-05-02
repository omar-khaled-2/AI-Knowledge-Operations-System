import type { ServerConfig } from './types';
import { logger } from './logger';
import Redis from 'ioredis';

export interface AuthResult {
  userId: string;
}

export class AuthService {
  private redis: Redis;

  constructor(private config: ServerConfig) {
    const options: any = {
      retryStrategy: (times: number) => Math.min(times * 50, 2000),
    };

    if (config.redisPassword) {
      options.password = config.redisPassword;
    }

    this.redis = new Redis(config.redisUrl, options);
  }

  /**
   * Validate a one-time ticket from query parameter.
   * Gets userId from Redis and deletes the ticket (one-time use).
   */
  async validateTicket(ticket: string | null): Promise<AuthResult | null> {
    if (!ticket) {
      logger.warn('No ticket provided');
      return null;
    }

    try {
      const key = `ws:ticket:${ticket}`;
      
      // Get and delete atomically
      const pipeline = this.redis.pipeline();
      pipeline.get(key);
      pipeline.del(key);
      
      const results = await pipeline.exec();
      const userId = results?.[0]?.[1] as string | null;
      
      if (!userId) {
        logger.warn(`Invalid or expired ticket: ${ticket}`);
        return null;
      }

      logger.debug(`Validated ticket for user ${userId}`);
      return { userId };
    } catch (error) {
      logger.error({ err: error }, 'Ticket validation error');
      return null;
    }
  }

  async disconnect() {
    await this.redis.quit();
  }
}
