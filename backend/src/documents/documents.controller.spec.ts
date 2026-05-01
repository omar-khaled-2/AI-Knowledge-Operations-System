import { Test, TestingModule } from '@nestjs/testing';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { ProjectsService } from '../projects/projects.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { BadRequestException, ForbiddenException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Types } from 'mongoose';

describe('DocumentsController', () => {
  let controller: DocumentsController;

  const mockDocumentsService = {
    findAllByProject: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    generateUploadUrl: jest.fn(),
  };

  const mockProjectsService = {
    findOne: jest.fn(),
  };

  const validUser = {
    id: '507f1f77bcf86cd799439011',
    email: 'test@example.com',
    name: 'Test User',
  };

  const validObjectId = '507f1f77bcf86cd799439011';
  const projectId = '507f1f77bcf86cd799439022';
  const documentId = '507f1f77bcf86cd799439033';

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DocumentsController],
      providers: [
        {
          provide: DocumentsService,
          useValue: mockDocumentsService,
        },
        {
          provide: ProjectsService,
          useValue: mockProjectsService,
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<DocumentsController>(DocumentsController);
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
    it('should return paginated documents with default params', async () => {
      const documents = [{ id: documentId, name: 'doc1.pdf' }];
      mockDocumentsService.findAllByProject.mockResolvedValue({
        documents,
        total: 1,
      });

      const result = await controller.findAll(projectId, '1', '12', '', '', validUser);

      expect(mockDocumentsService.findAllByProject).toHaveBeenCalledWith(
        projectId,
        validUser.id,
        { page: 1, limit: 12, sortBy: 'createdAt', sortOrder: 'desc' },
      );
      expect(result).toEqual({
        data: documents,
        total: 1,
      });
    });

    it('should parse page and limit correctly', async () => {
      mockDocumentsService.findAllByProject.mockResolvedValue({
        documents: [],
        total: 0,
      });

      await controller.findAll(projectId, '2', '25', 'name', 'asc', validUser);

      expect(mockDocumentsService.findAllByProject).toHaveBeenCalledWith(
        projectId,
        validUser.id,
        { page: 2, limit: 25, sortBy: 'name', sortOrder: 'asc' },
      );
    });

    it('should enforce minimum page of 1', async () => {
      mockDocumentsService.findAllByProject.mockResolvedValue({ documents: [], total: 0 });

      await controller.findAll(projectId, '0', '10', '', '', validUser);

      expect(mockDocumentsService.findAllByProject).toHaveBeenCalledWith(
        projectId,
        validUser.id,
        expect.objectContaining({ page: 1 }),
      );
    });

    it('should enforce maximum limit of 100', async () => {
      mockDocumentsService.findAllByProject.mockResolvedValue({ documents: [], total: 0 });

      await controller.findAll(projectId, '1', '200', '', '', validUser);

      expect(mockDocumentsService.findAllByProject).toHaveBeenCalledWith(
        projectId,
        validUser.id,
        expect.objectContaining({ limit: 100 }),
      );
    });

    it('should default sortOrder to desc', async () => {
      mockDocumentsService.findAllByProject.mockResolvedValue({ documents: [], total: 0 });

      await controller.findAll(projectId, '1', '10', 'name', 'invalid', validUser);

      expect(mockDocumentsService.findAllByProject).toHaveBeenCalledWith(
        projectId,
        validUser.id,
        expect.objectContaining({ sortOrder: 'desc' }),
      );
    });

    it('should return correct total count', async () => {
      mockDocumentsService.findAllByProject.mockResolvedValue({
        documents: [{ id: '1' }],
        total: 25,
      });

      const result = await controller.findAll(projectId, '1', '10', '', '', validUser);

      expect(result.total).toBe(25);
    });

    it('should throw BadRequestException when projectId is missing', async () => {
      await expect(controller.findAll('', '1', '10', '', '', validUser)).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.findAll('', '1', '10', '', '', validUser)).rejects.toThrow(
        'projectId query parameter is required',
      );
    });

    it('should handle NaN page and limit gracefully', async () => {
      mockDocumentsService.findAllByProject.mockResolvedValue({ documents: [], total: 0 });

      await controller.findAll(projectId, 'not-a-number', 'not-a-number', '', '', validUser);

      expect(mockDocumentsService.findAllByProject).toHaveBeenCalledWith(
        projectId,
        validUser.id,
        expect.objectContaining({ page: 1, limit: 12 }),
      );
    });
  });

  describe('findOne', () => {
    it('should return document by id', async () => {
      const document = { id: documentId, name: 'test.pdf' };
      mockDocumentsService.findOne.mockResolvedValue(document);

      const result = await controller.findOne(documentId, validUser);
      expect(mockDocumentsService.findOne).toHaveBeenCalledWith(documentId, validUser.id);
      expect(result).toEqual(document);
    });

    it('should throw NotFoundException when document not found', async () => {
      mockDocumentsService.findOne.mockResolvedValue(null);

      await expect(controller.findOne(documentId, validUser)).rejects.toThrow(NotFoundException);
      await expect(controller.findOne(documentId, validUser)).rejects.toThrow('Document not found');
    });
  });

  describe('create', () => {
    it('should create document when user owns the project', async () => {
      const createDto = {
        name: 'test.pdf',
        projectId,
        size: 1024,
        mimeType: 'application/pdf',
      };
      const createdDocument = { id: documentId, ...createDto };
      mockProjectsService.findOne.mockResolvedValue({ id: projectId, name: 'Test Project' });
      mockDocumentsService.create.mockResolvedValue(createdDocument);

      const result = await controller.create(createDto as any, validUser);
      expect(mockProjectsService.findOne).toHaveBeenCalledWith(projectId, validUser.id);
      expect(mockDocumentsService.create).toHaveBeenCalledWith(createDto, validUser.id);
      expect(result).toEqual(createdDocument);
    });

    it('should throw ForbiddenException when user does not own the project (IDOR protection)', async () => {
      const createDto = {
        name: 'test.pdf',
        projectId,
        size: 1024,
        mimeType: 'application/pdf',
      };
      mockProjectsService.findOne.mockResolvedValue(null);

      await expect(controller.create(createDto as any, validUser)).rejects.toThrow(ForbiddenException);
      await expect(controller.create(createDto as any, validUser)).rejects.toThrow('Project not found or access denied');
      expect(mockDocumentsService.create).not.toHaveBeenCalled();
    });

    it('should prevent document creation in another users project (IDOR)', async () => {
      const createDto = {
        name: 'malicious.pdf',
        projectId: '507f1f77bcf86cd799439099',
        size: 1024,
        mimeType: 'application/pdf',
      };
      mockProjectsService.findOne.mockResolvedValue(null);

      await expect(controller.create(createDto as any, validUser)).rejects.toThrow(ForbiddenException);
      expect(mockDocumentsService.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update document', async () => {
      const updateDto = { name: 'updated.pdf', status: 'processed' as const };
      const updatedDocument = { id: documentId, ...updateDto };
      mockDocumentsService.update.mockResolvedValue(updatedDocument);

      const result = await controller.update(documentId, updateDto as any, validUser);
      expect(mockDocumentsService.update).toHaveBeenCalledWith(documentId, updateDto, validUser.id);
      expect(result).toEqual(updatedDocument);
    });

    it('should throw NotFoundException when document not found', async () => {
      mockDocumentsService.update.mockResolvedValue(null);

      await expect(controller.update(documentId, {}, validUser)).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should remove document', async () => {
      const deletedDocument = { id: documentId, name: 'deleted.pdf' };
      mockDocumentsService.remove.mockResolvedValue(deletedDocument);

      const result = await controller.remove(documentId, validUser);
      expect(mockDocumentsService.remove).toHaveBeenCalledWith(documentId, validUser.id);
      expect(result).toEqual(deletedDocument);
    });

    it('should throw NotFoundException when document not found', async () => {
      mockDocumentsService.remove.mockResolvedValue(null);

      await expect(controller.remove(documentId, validUser)).rejects.toThrow(NotFoundException);
    });
  });

  describe('generateUploadUrl', () => {
    it('should generate upload URL when user owns the project', async () => {
      const dto = {
        filename: 'test.pdf',
        mimeType: 'application/pdf',
        projectId,
        size: 1024,
      };
      const uploadResult = {
        uploadUrl: 'https://signed-url.example.com',
        objectKey: 'uuid-test.pdf',
        document: { id: documentId, name: 'test.pdf' },
      };
      mockProjectsService.findOne.mockResolvedValue({ id: projectId, name: 'Test Project' });
      mockDocumentsService.generateUploadUrl.mockResolvedValue(uploadResult);

      const result = await controller.generateUploadUrl(dto as any, validUser);
      expect(mockProjectsService.findOne).toHaveBeenCalledWith(projectId, validUser.id);
      expect(mockDocumentsService.generateUploadUrl).toHaveBeenCalledWith(dto);
      expect(result).toEqual(uploadResult);
    });

    it('should throw ForbiddenException when user does not own the project (IDOR protection)', async () => {
      const dto = {
        filename: 'test.pdf',
        mimeType: 'application/pdf',
        projectId,
        size: 1024,
      };
      mockProjectsService.findOne.mockResolvedValue(null);

      await expect(controller.generateUploadUrl(dto as any, validUser)).rejects.toThrow(ForbiddenException);
      await expect(controller.generateUploadUrl(dto as any, validUser)).rejects.toThrow('Project not found or access denied');
      expect(mockDocumentsService.generateUploadUrl).not.toHaveBeenCalled();
    });

    it('should prevent upload URL generation for another users project (IDOR)', async () => {
      const dto = {
        filename: 'malicious.pdf',
        mimeType: 'application/pdf',
        projectId: '507f1f77bcf86cd799439099',
        size: 1024,
      };
      mockProjectsService.findOne.mockResolvedValue(null);

      await expect(controller.generateUploadUrl(dto as any, validUser)).rejects.toThrow(ForbiddenException);
      expect(mockDocumentsService.generateUploadUrl).not.toHaveBeenCalled();
    });
  });
});
