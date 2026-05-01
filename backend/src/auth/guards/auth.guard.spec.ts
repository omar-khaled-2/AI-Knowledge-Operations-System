import { Test, TestingModule } from '@nestjs/testing';
import { AuthGuard } from './auth.guard';
import { AuthService } from '../auth.service';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let mockAuthService: Partial<AuthService>;

  const createMockExecutionContext = (headers: Record<string, string | string[]> = {}): ExecutionContext => {
    const mockRequest = {
      headers,
    };
    return {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
    } as ExecutionContext;
  };

  beforeEach(async () => {
    mockAuthService = {
      auth: {
        api: {
          getSession: jest.fn(),
        },
      },
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthGuard,
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    guard = module.get<AuthGuard>(AuthGuard);
  });

  describe('canActivate', () => {
    it('should return true and attach user/session when session is valid', async () => {
      const mockSession = {
        user: { id: 'user123', email: 'test@example.com' },
        session: { id: 'session123' },
      };
      (mockAuthService.auth!.api.getSession as jest.Mock).mockResolvedValue(mockSession);

      const mockRequest = { headers: { authorization: 'Bearer token123' } };
      const context = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as ExecutionContext;

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockRequest).toHaveProperty('user', mockSession.user);
      expect(mockRequest).toHaveProperty('session', mockSession.session);
      expect(mockAuthService.auth!.api.getSession).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.any(Headers),
        }),
      );
    });

    it('should throw UnauthorizedException when session is null', async () => {
      (mockAuthService.auth!.api.getSession as jest.Mock).mockResolvedValue(null);

      const context = createMockExecutionContext({ authorization: 'Bearer invalid' });

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
      await expect(guard.canActivate(context)).rejects.toThrow('Invalid or expired session');
    });

    it('should throw UnauthorizedException when session is undefined', async () => {
      (mockAuthService.auth!.api.getSession as jest.Mock).mockResolvedValue(undefined);

      const context = createMockExecutionContext({});

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });

    it('should handle array header values', async () => {
      const mockSession = {
        user: { id: 'user123' },
        session: { id: 'session123' },
      };
      (mockAuthService.auth!.api.getSession as jest.Mock).mockResolvedValue(mockSession);

      const mockRequest = { headers: { 'x-custom': ['value1', 'value2'] } };
      const context = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as ExecutionContext;

      await guard.canActivate(context);
      expect(mockAuthService.auth!.api.getSession).toHaveBeenCalled();
    });

    it('should handle single string header values', async () => {
      const mockSession = {
        user: { id: 'user123' },
        session: { id: 'session123' },
      };
      (mockAuthService.auth!.api.getSession as jest.Mock).mockResolvedValue(mockSession);

      const mockRequest = { headers: { 'content-type': 'application/json' } };
      const context = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as ExecutionContext;

      await guard.canActivate(context);
      expect(mockAuthService.auth!.api.getSession).toHaveBeenCalled();
    });

    it('should skip undefined header values', async () => {
      const mockSession = {
        user: { id: 'user123' },
        session: { id: 'session123' },
      };
      (mockAuthService.auth!.api.getSession as jest.Mock).mockResolvedValue(mockSession);

      const mockRequest = { headers: { 'x-undefined': undefined, 'x-defined': 'value' } };
      const context = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as ExecutionContext;

      await guard.canActivate(context);
      expect(mockAuthService.auth!.api.getSession).toHaveBeenCalled();
    });

    it('should handle empty headers object', async () => {
      const mockSession = {
        user: { id: 'user123' },
        session: { id: 'session123' },
      };
      (mockAuthService.auth!.api.getSession as jest.Mock).mockResolvedValue(mockSession);

      const context = createMockExecutionContext({});

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });
  });
});
