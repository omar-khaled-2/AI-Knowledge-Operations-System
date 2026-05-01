import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AuthGuard } from './auth/guards/auth.guard';
import { AuthService } from './auth/auth.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            auth: {
              api: {
                getSession: jest.fn(),
              },
            },
          },
        },
      ],
    }).overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    appController = moduleRef.get<AppController>(AppController);
  });

  describe('health', () => {
    it('should return status ok', () => {
      const result = appController.health();
      expect(result).toEqual({ status: 'ok' });
    });
  });

  describe('root', () => {
    it('should return API message', () => {
      const result = appController.root();
      expect(result).toEqual({ message: 'AI Knowledge Operations API' });
    });
  });

  describe('getProfile', () => {
    it('should return the current user', () => {
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        name: 'Test User',
        googleId: 'google123',
      } as any;

      const result = appController.getProfile(mockUser);
      expect(result).toEqual({ user: mockUser });
    });

    it('should handle user with minimal fields', () => {
      const minimalUser = { id: 'user456' } as any;
      const result = appController.getProfile(minimalUser);
      expect(result).toEqual({ user: minimalUser });
    });
  });
});
