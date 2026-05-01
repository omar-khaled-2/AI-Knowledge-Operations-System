import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { Types } from 'mongoose';

describe('UsersController', () => {
  let controller: UsersController;

  const mockUsersService = {
    findById: jest.fn(),
    update: jest.fn(),
  };

  const validUser = {
    id: '507f1f77bcf86cd799439011',
    email: 'test@example.com',
    name: 'Test User',
  };

  const validObjectId = '507f1f77bcf86cd799439011';

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<UsersController>(UsersController);
  });

  describe('getUserId', () => {
    it('should extract user id from user.id', () => {
      const result = (controller as any).getUserId(validUser);
      expect(result).toBe(validUser.id);
    });

    it('should extract user id from user._id', () => {
      const user = { _id: validObjectId };
      const result = (controller as any).getUserId(user);
      expect(result).toBe(validObjectId);
    });

    it('should extract user id from user.userId', () => {
      const user = { userId: validObjectId };
      const result = (controller as any).getUserId(user);
      expect(result).toBe(validObjectId);
    });

    it('should handle ObjectId instances', () => {
      const user = { id: new Types.ObjectId(validObjectId) };
      const result = (controller as any).getUserId(user);
      expect(result).toBe(validObjectId);
    });

    it('should throw UnauthorizedException when user is null', () => {
      expect(() => (controller as any).getUserId(null)).toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when user is undefined', () => {
      expect(() => (controller as any).getUserId(undefined)).toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when no id field exists', () => {
      expect(() => (controller as any).getUserId({})).toThrow(UnauthorizedException);
    });

    it('should throw BadRequestException for invalid user ID format', () => {
      expect(() => (controller as any).getUserId({ id: 'invalid-id' })).toThrow(BadRequestException);
    });
  });

  describe('getMe', () => {
    it('should return the current user profile', async () => {
      mockUsersService.findById.mockResolvedValue(validUser);

      const result = await controller.getMe(validUser);
      expect(mockUsersService.findById).toHaveBeenCalledWith(validUser.id);
      expect(result).toEqual(validUser);
    });

    it('should throw UnauthorizedException when user profile not found', async () => {
      mockUsersService.findById.mockResolvedValue(null);

      await expect(controller.getMe(validUser)).rejects.toThrow(UnauthorizedException);
      await expect(controller.getMe(validUser)).rejects.toThrow('User profile not found');
    });
  });

  describe('updateMe', () => {
    it('should update the current user profile', async () => {
      const updateDto = { name: 'Updated Name' };
      const updatedUser = { ...validUser, ...updateDto };
      mockUsersService.update.mockResolvedValue(updatedUser);

      const result = await controller.updateMe(updateDto as any, validUser);
      expect(mockUsersService.update).toHaveBeenCalledWith(validUser.id, updateDto);
      expect(result).toEqual(updatedUser);
    });

    it('should strip googleId from update to prevent privilege escalation', async () => {
      const updateDto = { name: 'Updated Name', googleId: 'hacked-google-id' } as any;
      const updatedUser = { ...validUser, name: 'Updated Name' };
      mockUsersService.update.mockResolvedValue(updatedUser);

      const result = await controller.updateMe(updateDto, validUser);
      expect(mockUsersService.update).toHaveBeenCalledWith(validUser.id, { name: 'Updated Name' });
      expect(result).toEqual(updatedUser);
    });

    it('should throw UnauthorizedException when user profile not found', async () => {
      mockUsersService.update.mockResolvedValue(null);

      await expect(controller.updateMe({ name: 'New' } as any, validUser)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('IDOR Protection', () => {
    it('should only allow access to own profile (getMe)', async () => {
      mockUsersService.findById.mockResolvedValue(validUser);

      await controller.getMe(validUser);
      expect(mockUsersService.findById).toHaveBeenCalledWith(validUser.id);
    });

    it('should only allow updates to own profile (updateMe)', async () => {
      const updateDto = { name: 'Updated' };
      mockUsersService.update.mockResolvedValue({ ...validUser, ...updateDto });

      await controller.updateMe(updateDto as any, validUser);
      expect(mockUsersService.update).toHaveBeenCalledWith(validUser.id, updateDto);
    });

    it('should not expose endpoint to list all users', () => {
      const prototype = Object.getOwnPropertyNames(UsersController.prototype);
      expect(prototype).not.toContain('findAll');
    });

    it('should not expose endpoint to get user by id', () => {
      const prototype = Object.getOwnPropertyNames(UsersController.prototype);
      expect(prototype).not.toContain('findOne');
    });
  });
});
