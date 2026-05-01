import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Types } from 'mongoose';

describe('ProjectsController', () => {
  let controller: ProjectsController;

  const mockProjectsService = {
    findAllByOwner: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
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
      controllers: [ProjectsController],
      providers: [
        {
          provide: ProjectsService,
          useValue: mockProjectsService,
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ProjectsController>(ProjectsController);
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
      expect(() => (controller as any).getUserId(null)).toThrow('User not authenticated');
    });

    it('should throw UnauthorizedException when user is undefined', () => {
      expect(() => (controller as any).getUserId(undefined)).toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when no id field exists', () => {
      expect(() => (controller as any).getUserId({})).toThrow(UnauthorizedException);
      expect(() => (controller as any).getUserId({})).toThrow('User ID not found in session');
    });

    it('should throw BadRequestException for invalid user ID format', () => {
      expect(() => (controller as any).getUserId({ id: 'invalid-id' })).toThrow(BadRequestException);
      expect(() => (controller as any).getUserId({ id: 'invalid-id' })).toThrow('Invalid user ID format: invalid-id');
    });
  });

  describe('findAll', () => {
    it('should return all projects for owner', async () => {
      const projects = [
        { id: '1', name: 'Project 1' },
        { id: '2', name: 'Project 2' },
      ];
      mockProjectsService.findAllByOwner.mockResolvedValue(projects);

      const result = await controller.findAll(validUser);
      expect(mockProjectsService.findAllByOwner).toHaveBeenCalledWith(validUser.id);
      expect(result).toEqual(projects);
    });

    it('should return empty array when no projects exist', async () => {
      mockProjectsService.findAllByOwner.mockResolvedValue([]);

      const result = await controller.findAll(validUser);
      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return project by id', async () => {
      const project = { id: validObjectId, name: 'Test Project' };
      mockProjectsService.findOne.mockResolvedValue(project);

      const result = await controller.findOne(validObjectId, validUser);
      expect(mockProjectsService.findOne).toHaveBeenCalledWith(validObjectId, validUser.id);
      expect(result).toEqual(project);
    });

    it('should throw NotFoundException when project not found', async () => {
      mockProjectsService.findOne.mockResolvedValue(null);

      await expect(controller.findOne(validObjectId, validUser)).rejects.toThrow(NotFoundException);
      await expect(controller.findOne(validObjectId, validUser)).rejects.toThrow('Project not found');
    });
  });

  describe('create', () => {
    it('should create project', async () => {
      const createDto = { name: 'New Project', description: 'Desc', color: 'pink' as const };
      const createdProject = { id: validObjectId, ...createDto };
      mockProjectsService.create.mockResolvedValue(createdProject);

      const result = await controller.create(createDto, validUser);
      expect(mockProjectsService.create).toHaveBeenCalledWith(createDto, validUser.id);
      expect(result).toEqual(createdProject);
    });
  });

  describe('update', () => {
    it('should update project', async () => {
      const updateDto = { name: 'Updated Project' };
      const updatedProject = { id: validObjectId, ...updateDto };
      mockProjectsService.update.mockResolvedValue(updatedProject);

      const result = await controller.update(validObjectId, updateDto, validUser);
      expect(mockProjectsService.update).toHaveBeenCalledWith(validObjectId, updateDto, validUser.id);
      expect(result).toEqual(updatedProject);
    });

    it('should throw NotFoundException when project not found', async () => {
      mockProjectsService.update.mockResolvedValue(null);

      await expect(controller.update(validObjectId, {}, validUser)).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should remove project', async () => {
      const deletedProject = { id: validObjectId, name: 'Deleted Project' };
      mockProjectsService.remove.mockResolvedValue(deletedProject);

      const result = await controller.remove(validObjectId, validUser);
      expect(mockProjectsService.remove).toHaveBeenCalledWith(validObjectId, validUser.id);
      expect(result).toEqual(deletedProject);
    });

    it('should throw NotFoundException when project not found', async () => {
      mockProjectsService.remove.mockResolvedValue(null);

      await expect(controller.remove(validObjectId, validUser)).rejects.toThrow(NotFoundException);
    });
  });
});
