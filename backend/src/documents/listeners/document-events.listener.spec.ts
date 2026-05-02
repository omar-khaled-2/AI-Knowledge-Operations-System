import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { DocumentEventsListener } from './document-events.listener';
import { RabbitMQService } from '../../rabbitmq/rabbitmq.service';
import { DocumentCreatedEvent } from '../events/document-created.event';

describe('DocumentEventsListener', () => {
  let listener: DocumentEventsListener;
  let mockRabbitMQService: { publish: jest.Mock };

  beforeEach(async () => {
    mockRabbitMQService = {
      publish: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentEventsListener,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config: Record<string, string> = {
                'app.rabbitmqDocumentQueue': 'document-jobs',
              };
              return config[key];
            }),
          },
        },
        {
          provide: RabbitMQService,
          useValue: mockRabbitMQService,
        },
      ],
    }).compile();

    listener = module.get<DocumentEventsListener>(DocumentEventsListener);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(listener).toBeDefined();
  });

  describe('handleDocumentCreated', () => {
    it('should publish event to RabbitMQ', async () => {
      const event = new DocumentCreatedEvent(
        'doc-123',
        'proj-456',
        'user-789',
        'object-key-123',
        'test.pdf',
        'application/pdf',
        1024,
        'upload',
      );

      await listener.handleDocumentCreated(event);

      expect(mockRabbitMQService.publish).toHaveBeenCalledWith(
        'document.created',
        {
          documentId: 'doc-123',
          projectId: 'proj-456',
          ownerId: 'user-789',
          objectKey: 'object-key-123',
          filename: 'test.pdf',
          mimeType: 'application/pdf',
          size: 1024,
          sourceType: 'upload',
          timestamp: expect.any(String),
        },
        {
          messageId: 'doc-123',
        },
      );
    });

    it('should handle RabbitMQ errors gracefully', async () => {
      mockRabbitMQService.publish.mockRejectedValueOnce(new Error('Connection failed'));

      const event = new DocumentCreatedEvent(
        'doc-123',
        'proj-456',
        'user-789',
        'object-key-123',
        'test.pdf',
        'application/pdf',
        1024,
        'upload',
      );

      // Should not throw
      await expect(listener.handleDocumentCreated(event)).resolves.not.toThrow();
    });
  });
});
