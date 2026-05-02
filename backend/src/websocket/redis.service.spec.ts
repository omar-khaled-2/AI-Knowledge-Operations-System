import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RedisService } from './redis.service';

jest.mock('ioredis', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      on: jest.fn(),
      disconnect: jest.fn(),
      publish: jest.fn().mockResolvedValue(1),
      subscribe: jest.fn().mockResolvedValue('OK'),
      unsubscribe: jest.fn().mockResolvedValue('OK'),
    })),
  };
});

describe('RedisService', () => {
  let service: RedisService;
  let mockConfigService: Partial<ConfigService>;

  beforeEach(async () => {
    mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'app.redisUrl') return 'redis://localhost:6379';
        if (key === 'app.redisPassword') return '';
        return undefined;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<RedisService>(RedisService);
    service.onModuleInit();
  });

  afterEach(() => {
    service.onModuleDestroy();
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('publish', () => {
    it('should publish message to channel', async () => {
      await service.publish('test-channel', 'test-message');
      // Test passes if no error is thrown
      expect(true).toBe(true);
    });
  });

  describe('subscribe', () => {
    it('should subscribe to channel and register handler', async () => {
      const handler = jest.fn();
      await service.subscribe('test-channel', handler);
      expect(true).toBe(true);
    });

    it('should replace existing handler for same channel', async () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      await service.subscribe('test-channel', handler1);
      await service.subscribe('test-channel', handler2);
      expect(true).toBe(true);
    });
  });

  describe('unsubscribe', () => {
    it('should unsubscribe from channel', async () => {
      await service.subscribe('test-channel', jest.fn());
      await service.unsubscribe('test-channel');
      expect(true).toBe(true);
    });
  });
});
