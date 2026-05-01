import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { DocumentEventsListener } from './document-events.listener';
import { DocumentCreatedEvent } from '../events/document-created.event';

// Mock ioredis
jest.mock('ioredis', () => {
  const mockConstructor = jest.fn().mockImplementation(() => ({
    xadd: jest.fn().mockResolvedValue('1234567890-0'),
    on: jest.fn(),
    disconnect: jest.fn(),
  }));
  return {
    __esModule: true,
    default: mockConstructor,
  };
});

describe('DocumentEventsListener', () => {
  let listener: DocumentEventsListener;
  let mockRedis: { xadd: jest.Mock; on: jest.Mock; disconnect: jest.Mock };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentEventsListener,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config: Record<string, string | number> = {
                'app.redisHost': 'localhost',
                'app.redisPort': 6379,
                'app.redisStreamKey': 'documents:events',
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    listener = module.get<DocumentEventsListener>(DocumentEventsListener);
    // @ts-expect-error - accessing private field for testing
    mockRedis = listener['redis'];
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(listener).toBeDefined();
  });

  describe('handleDocumentCreated', () => {
    it('should publish event to Redis stream', async () => {
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

      expect(mockRedis.xadd).toHaveBeenCalledWith(
        'documents:events',
        '*',
        'documentId', 'doc-123',
        'projectId', 'proj-456',
        'ownerId', 'user-789',
        'objectKey', 'object-key-123',
        'name', 'test.pdf',
        'mimeType', 'application/pdf',
        'size', '1024',
        'sourceType', 'upload',
        'timestamp', expect.any(String),
      );
    });

    it('should handle Redis errors gracefully', async () => {
      mockRedis.xadd.mockRejectedValueOnce(new Error('Redis connection failed'));

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
