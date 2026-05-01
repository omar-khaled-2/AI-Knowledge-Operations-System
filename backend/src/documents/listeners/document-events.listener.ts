import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { DocumentCreatedEvent } from '../events/document-created.event';

@Injectable()
export class DocumentEventsListener {
  private readonly logger = new Logger(DocumentEventsListener.name);
  private readonly redis: Redis;
  private readonly streamKey: string;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('app.redisHost');
    const port = this.configService.get<number>('app.redisPort');
    this.streamKey = this.configService.get<string>('app.redisStreamKey') || 'documents:events';
    
    this.redis = new Redis({
      host,
      port,
      retryStrategy: (times) => Math.min(times * 50, 2000),
    });

    this.redis.on('error', (err) => {
      this.logger.error('Redis connection error', err.message);
    });
  }

  @OnEvent('document.created')
  async handleDocumentCreated(event: DocumentCreatedEvent) {
    try {
      await this.redis.xadd(
        this.streamKey,
        '*', // Auto-generate ID
        'documentId', event.documentId,
        'projectId', event.projectId,
        'ownerId', event.ownerId,
        'objectKey', event.objectKey,
        'name', event.name,
        'mimeType', event.mimeType,
        'size', String(event.size),
        'sourceType', event.sourceType,
        'timestamp', event.timestamp,
      );

      this.logger.log(
        `Published document.created event to Redis stream`,
        {
          documentId: event.documentId,
          streamKey: this.streamKey,
        },
      );
    } catch (error) {
      this.logger.error(
        'Failed to publish document.created event to Redis stream',
        {
          documentId: event.documentId,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      // Event is lost - acceptable for v1
    }
  }
}
