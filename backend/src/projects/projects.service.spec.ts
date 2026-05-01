import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsService } from './projects.service';
import { getModelToken } from '@nestjs/mongoose';
import { Project } from './schemas/project.schema';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';

describe('ProjectsService', () => {
  let service: ProjectsService;
  let mockProjectModel: any;

  const ownerId = '507f1f77bcf86cd799439011';
  const projectId = '507f1f77bcf86cd799439022';

  const mockProject = {
    _id: projectId,
    id: projectId,
    name: 'Test Project',
    description: 'Test Description',
    color: 'pink',
    owner: new Types.ObjectId(ownerId),
    documentCount: 0,
    sourceCount: 0,
    sessionCount: 0,
    insightCount: 0,
    lastUpdated: new Date(),
  };

  beforeEach(async () => {
    mockProjectModel = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        {
          provide: getModelToken(Project.name),
          useValue: mockProjectModel,
        },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
  });

  describe('toObjectId', () => {
    it('should convert valid string to ObjectId', () => {
      const result = (service as any).toObjectId(ownerId);
      expect(result).toBeInstanceOf(Types.ObjectId);
      expect(result.toString()).toBe(ownerId);
    });

    it('should throw BadRequestException for invalid ID', () => {
      expect(() => (service as any).toObjectId('invalid-id')).toThrow(BadRequestException);
      expect(() => (service as any).toObjectId('invalid-id')).toThrow('Invalid ID format: invalid-id');
    });

    it('should throw BadRequestException for empty string', () => {
      expect(() => (service as any).toObjectId('')).toThrow(BadRequestException);
    });

    it('should throw BadRequestException for malformed ObjectId', () => {
      expect(() => (service as any).toObjectId('507f1f77bcf86cd79943901')).toThrow(BadRequestException);
    });
  });

  describe('findAllByOwner', () => {
    it('should return projects sorted by lastUpdated descending', async () => {
      const projects = [mockProject];
      mockProjectModel.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(projects),
        }),
      });

      const result = await service.findAllByOwner(ownerId);
      expect(mockProjectModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          owner: expect.any(Types.ObjectId),
        }),
      );
      expect(result).toEqual(projects);
    });

    it('should return empty array when no projects found', async () => {
      mockProjectModel.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([]),
        }),
      });

      const result = await service.findAllByOwner(ownerId);
      expect(result).toEqual([]);
    });

    it('should throw BadRequestException for invalid ownerId', async () => {
      await expect(service.findAllByOwner('invalid')).rejects.toThrow(BadRequestException);
    });
  });

  describe('findOne', () => {
    it('should return project by id and owner', async () => {
      mockProjectModel.findOne = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockProject),
      });

      const result = await service.findOne(projectId, ownerId);
      expect(mockProjectModel.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          _id: expect.any(Types.ObjectId),
          owner: expect.any(Types.ObjectId),
        }),
      );
      expect(result).toEqual(mockProject);
    });

    it('should return null when project not found', async () => {
      mockProjectModel.findOne = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await service.findOne(projectId, ownerId);
      expect(result).toBeNull();
    });

    it('should throw BadRequestException for invalid project id', async () => {
      await expect(service.findOne('invalid', ownerId)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid owner id', async () => {
      await expect(service.findOne(projectId, 'invalid')).rejects.toThrow(BadRequestException);
    });
  });

  describe('create', () => {
    it('should create project with owner and lastUpdated', async () => {
      const createDto: CreateProjectDto = {
        name: 'New Project',
        description: 'New Description',
        color: 'teal',
      };

      const mockSave = jest.fn().mockResolvedValue({
        ...mockProject,
        ...createDto,
      });
      mockProjectModel.mockImplementation(() => ({
        save: mockSave,
      }));

      const result = await service.create(createDto, ownerId);
      expect(mockProjectModel).toHaveBeenCalledWith(
        expect.objectContaining({
          ...createDto,
          owner: expect.any(Types.ObjectId),
          lastUpdated: expect.any(Date),
        }),
      );
      expect(mockSave).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should throw BadRequestException for invalid ownerId', async () => {
      const createDto: CreateProjectDto = {
        name: 'New Project',
        description: 'Desc',
        color: 'pink',
      };
      await expect(service.create(createDto, 'invalid')).rejects.toThrow(BadRequestException);
    });
  });

  describe('update', () => {
    it('should update project and return updated project', async () => {
      const updateDto: UpdateProjectDto = { name: 'Updated Name' };
      const updatedProject = { ...mockProject, ...updateDto };
      mockProjectModel.findOneAndUpdate = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(updatedProject),
      });

      const result = await service.update(projectId, updateDto, ownerId);
      expect(mockProjectModel.findOneAndUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          _id: expect.any(Types.ObjectId),
          owner: expect.any(Types.ObjectId),
        }),
        expect.objectContaining({
          ...updateDto,
          lastUpdated: expect.any(Date),
        }),
        { new: true },
      );
      expect(result).toEqual(updatedProject);
    });

    it('should return null when project not found during update', async () => {
      mockProjectModel.findOneAndUpdate = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await service.update(projectId, { name: 'New' }, ownerId);
      expect(result).toBeNull();
    });

    it('should throw BadRequestException for invalid project id', async () => {
      await expect(service.update('invalid', {}, ownerId)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid owner id', async () => {
      await expect(service.update(projectId, {}, 'invalid')).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('should delete project and return deleted project', async () => {
      mockProjectModel.findOneAndDelete = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockProject),
      });

      const result = await service.remove(projectId, ownerId);
      expect(mockProjectModel.findOneAndDelete).toHaveBeenCalledWith(
        expect.objectContaining({
          _id: expect.any(Types.ObjectId),
          owner: expect.any(Types.ObjectId),
        }),
      );
      expect(result).toEqual(mockProject);
    });

    it('should return null when project not found during delete', async () => {
      mockProjectModel.findOneAndDelete = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await service.remove(projectId, ownerId);
      expect(result).toBeNull();
    });

    it('should throw BadRequestException for invalid project id', async () => {
      await expect(service.remove('invalid', ownerId)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid owner id', async () => {
      await expect(service.remove(projectId, 'invalid')).rejects.toThrow(BadRequestException);
    });
  });
});
