import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { getModelToken } from '@nestjs/mongoose';
import { User } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

describe('UsersService', () => {
  let service: UsersService;
  let mockUserModel: any;

  const mockUsers = [
    { id: '1', email: 'user1@example.com', name: 'User One', googleId: 'google1' },
    { id: '2', email: 'user2@example.com', name: 'User Two', googleId: 'google2' },
  ];

  beforeEach(async () => {
    mockUserModel = jest.fn();
    mockUserModel.find = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(mockUsers),
    });
    mockUserModel.findOne = jest.fn().mockReturnValue({
      exec: jest.fn(),
    });
    mockUserModel.findById = jest.fn().mockReturnValue({
      exec: jest.fn(),
    });
    mockUserModel.findByIdAndUpdate = jest.fn().mockReturnValue({
      exec: jest.fn(),
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  describe('findAll', () => {
    it('should return all users', async () => {
      const result = await service.findAll();
      expect(mockUserModel.find).toHaveBeenCalled();
      expect(result).toEqual(mockUsers);
    });

    it('should return empty array when no users exist', async () => {
      mockUserModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([]),
      });
      const result = await service.findAll();
      expect(result).toEqual([]);
    });
  });

  describe('findById', () => {
    it('should return user by id', async () => {
      const user = mockUsers[0];
      mockUserModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(user),
      });

      const validId = '507f1f77bcf86cd799439011';
      const result = await service.findById(validId);
      expect(mockUserModel.findById).toHaveBeenCalledWith(validId);
      expect(result).toEqual(user);
    });

    it('should return null when user not found by id', async () => {
      mockUserModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await service.findById('999');
      expect(result).toBeNull();
    });

    it('should return null for invalid ObjectId format', async () => {
      const result = await service.findById('invalid-id');
      expect(mockUserModel.findById).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it('should handle valid ObjectId string', async () => {
      const user = mockUsers[0];
      mockUserModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(user),
      });

      const validId = '507f1f77bcf86cd799439011';
      const result = await service.findById(validId);
      expect(mockUserModel.findById).toHaveBeenCalledWith(validId);
      expect(result).toEqual(user);
    });
  });

  describe('findByEmail', () => {
    it('should return user by email', async () => {
      const user = mockUsers[0];
      mockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(user),
      });

      const result = await service.findByEmail('user1@example.com');
      expect(mockUserModel.findOne).toHaveBeenCalledWith({ email: 'user1@example.com' });
      expect(result).toEqual(user);
    });

    it('should return null when user not found by email', async () => {
      mockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await service.findByEmail('nonexistent@example.com');
      expect(result).toBeNull();
    });
  });

  describe('findByGoogleId', () => {
    it('should return user by googleId', async () => {
      const user = mockUsers[0];
      mockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(user),
      });

      const result = await service.findByGoogleId('google1');
      expect(mockUserModel.findOne).toHaveBeenCalledWith({ googleId: 'google1' });
      expect(result).toEqual(user);
    });

    it('should return null when user not found by googleId', async () => {
      mockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await service.findByGoogleId('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create and save a new user', async () => {
      const createUserDto: CreateUserDto = {
        email: 'new@example.com',
        name: 'New User',
        googleId: 'newgoogle123',
      };

      const savedUser = { id: '3', ...createUserDto };
      const mockSave = jest.fn().mockResolvedValue(savedUser);
      mockUserModel.mockImplementation(() => ({
        save: mockSave,
      }));

      const result = await service.create(createUserDto);
      expect(mockUserModel).toHaveBeenCalledWith(createUserDto);
      expect(mockSave).toHaveBeenCalled();
      expect(result).toEqual(savedUser);
    });
  });

  describe('update', () => {
    it('should update user and return updated user', async () => {
      const updateUserDto: UpdateUserDto = { name: 'Updated Name' };
      const updatedUser = { id: '1', ...mockUsers[0], ...updateUserDto };
      mockUserModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(updatedUser),
      });

      const result = await service.update('1', updateUserDto);
      expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith(
        '1',
        updateUserDto,
        { new: true },
      );
      expect(result).toEqual(updatedUser);
    });

    it('should return null when user to update does not exist', async () => {
      mockUserModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await service.update('999', { name: 'New Name' });
      expect(result).toBeNull();
    });

    it('should handle partial updates', async () => {
      const updateUserDto: UpdateUserDto = { email: 'updated@example.com' };
      const updatedUser = { ...mockUsers[0], email: 'updated@example.com' };
      mockUserModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(updatedUser),
      });

      const result = await service.update('1', updateUserDto);
      expect(result?.email).toBe('updated@example.com');
    });
  });
});
