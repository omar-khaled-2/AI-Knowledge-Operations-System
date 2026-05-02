import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { randomUUID } from 'crypto';

@Injectable()
export class WebSocketTicketService implements OnModuleDestroy {
  private readonly logger = new Logger(WebSocketTicketService.name);
  private redis: Redis;
  private readonly ticketTtl: number = 300; // 5 minutes

  constructor(private readonly configService: ConfigService) {
    const redisUrl = this.configService.get<string>('app.redisUrl');
    const redisPassword = this.configService.get<string>('app.redisPassword');

    const options: any = {
      retryStrategy: (times: number) => Math.min(times * 50, 2000),
    };

    if (redisPassword) {
      options.password = redisPassword;
    }

    this.redis = new Redis(redisUrl, options);
  }

  /**
   * Generate a one-time ticket for WebSocket authentication.
   * Stores ticket → userId mapping in Redis with 5min TTL.
   */
  async generateTicket(userId: string): Promise<string> {
    const ticket = randomUUID();
    const key = `ws:ticket:${ticket}`;
    
    await this.redis.setex(key, this.ticketTtl, userId);
    
    this.logger.debug(`Generated ticket for user ${userId}`, { ticket });
    return ticket;
  }

  /**
   * Validate and redeem a ticket.
   * Returns userId if valid, null if invalid/expired.
   * Deletes the ticket after validation (one-time use).
   */
  async validateTicket(ticket: string): Promise<string | null> {
    const key = `ws:ticket:${ticket}`;
    
    // Get and delete atomically using Redis pipeline
    const pipeline = this.redis.pipeline();
    pipeline.get(key);
    pipeline.del(key);
    
    const results = await pipeline.exec();
    const userId = results?.[0]?.[1] as string | null;
    
    if (userId) {
      this.logger.debug(`Validated ticket for user ${userId}`);
    } else {
      this.logger.warn(`Invalid or expired ticket: ${ticket}`);
    }
    
    return userId;
  }

  async onModuleDestroy() {
    await this.redis.quit();
  }
}
