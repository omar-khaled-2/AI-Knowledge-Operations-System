import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { Request, Response } from 'express';

const mockToNodeHandler = jest.fn();

jest.mock('better-auth/node', () => ({
  toNodeHandler: jest.fn(() => mockToNodeHandler),
}));

describe('AuthController', () => {
  let controller: AuthController;
  let mockAuthService: Partial<AuthService>;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockAuthService = {
      auth: {
        api: {
          getSession: jest.fn(),
        },
      },
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  describe('handleAuth', () => {
    it('should pass request to better-auth handler', async () => {
      const mockReq = { url: '/api/auth/sign-in' } as Request;
      const mockRes = { statusCode: 200 } as Response;

      mockToNodeHandler.mockImplementation((req, res) => {
        res.statusCode = 200;
        return Promise.resolve();
      });

      await controller.handleAuth(mockReq, mockRes);

      expect(mockToNodeHandler).toHaveBeenCalledWith(mockReq, mockRes);
      expect(mockToNodeHandler).toHaveBeenCalledWith(mockReq, mockRes);
    });

    it('should handle different auth endpoints', async () => {
      const mockReq = { url: '/api/auth/callback/google' } as Request;
      const mockRes = { statusCode: 302 } as Response;

      mockToNodeHandler.mockResolvedValue(undefined);

      await controller.handleAuth(mockReq, mockRes);

      expect(mockToNodeHandler).toHaveBeenCalledWith(mockReq, mockRes);
    });
  });
});
