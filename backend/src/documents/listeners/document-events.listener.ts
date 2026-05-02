import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { RabbitMQService } from '../../rabbitmq/rabbitmq.service';
import { DocumentCreatedEvent } from '../events/document-created.event';

@Injectable()
export class DocumentEventsListener {
  private readonly logger = new Logger(DocumentEventsListener.name);
  private readonly documentQueue: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly rabbitmqService: RabbitMQService,
  ) {
    this.documentQueue = this.configService.get<string>('app.rabbitmqDocumentQueue') || 'document-jobs';
  }

  @OnEvent('document.created')
  async handleDocumentCreated(event: DocumentCreatedEvent) {
    this.logger.debug(
      `Processing document.created event: documentId=${event.documentId}`,
    );

    try {
      await this.rabbitmqService.publish(
        'document.created',
        {
          documentId: event.documentId,
          projectId: event.projectId,
          ownerId: event.ownerId,
          objectKey: event.objectKey,
          filename: event.name,
          mimeType: event.mimeType,
          size: event.size,
          sourceType: event.sourceType,
          timestamp: event.timestamp,
        },
        {
          messageId: event.documentId,
        },
      );

      this.logger.log(
        `Published document.created event to RabbitMQ`,
        {
          documentId: event.documentId,
          exchange: 'documents',
          routingKey: 'document.created',
        },
      );
    } catch (error) {
      this.logger.error(
        'Failed to publish document.created event to RabbitMQ',
        {
          documentId: event.documentId,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      // Event is lost - acceptable for v1
    }
  }
}
