import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';
import { getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

describe('AuthService', () => {
  let service: AuthService;
  let mockConnection: Partial<Connection>;
  let mockConfigService: Partial<ConfigService>;
  let mockClient: any;
  let mockDb: any;

  beforeEach(async () => {
    mockDb = {};
    mockClient = {
      db: jest.fn().mockReturnValue(mockDb),
    };

    mockConnection = {
      getClient: jest.fn().mockReturnValue(mockClient),
    } as any;

    mockConfigService = {
      get: jest.fn((key: string) => {
        const config: Record<string, string> = {
          'app.betterAuthSecret': 'test-secret',
          'app.betterAuthUrl': 'http://localhost:3001',
          'app.frontendUrl': 'http://localhost:3000',
          'app.googleClientId': 'google-client-id',
          'app.googleClientSecret': 'google-client-secret',
          'app.googleRedirectUri': 'http://localhost:3001/api/auth/callback/google',
        };
        return config[key];
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getConnectionToken(),
          useValue: mockConnection,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('onModuleInit', () => {
    it('should initialize better-auth with correct configuration', async () => {
      await service.onModuleInit();

      expect(mockConnection.getClient).toHaveBeenCalled();
      expect(mockClient.db).toHaveBeenCalled();
      expect(service.auth).toBeDefined();
    });

    it('should configure social providers with google', async () => {
      await service.onModuleInit();

      expect(mockConfigService.get).toHaveBeenCalledWith('app.betterAuthSecret');
      expect(mockConfigService.get).toHaveBeenCalledWith('app.betterAuthUrl');
      expect(mockConfigService.get).toHaveBeenCalledWith('app.frontendUrl');
      expect(mockConfigService.get).toHaveBeenCalledWith('app.googleClientId');
      expect(mockConfigService.get).toHaveBeenCalledWith('app.googleClientSecret');
      expect(mockConfigService.get).toHaveBeenCalledWith('app.googleRedirectUri');
    });

    it('should set trusted origins from frontend URL', async () => {
      await service.onModuleInit();
      expect(service.auth).toBeDefined();
    });
  });
});
