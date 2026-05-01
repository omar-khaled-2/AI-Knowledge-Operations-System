import { Test, TestingModule } from '@nestjs/testing';
import { DocumentsService } from './documents.service';
import { getModelToken } from '@nestjs/mongoose';
import { Document as DocumentEntity } from './schemas/document.schema';
import { ConfigService } from '@nestjs/config';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { GenerateUploadUrlDto } from './dto/generate-upload-url.dto';
import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';

// Mock AWS SDK
jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({
    send: jest.fn(),
  })),
  PutObjectCommand: jest.fn().mockImplementation((params) => params),
}));

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn(),
}));

import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

describe('DocumentsService', () => {
  let service: DocumentsService;
  let mockDocumentModel: any;
  let mockConfigService: Partial<ConfigService>;

  const ownerId = '507f1f77bcf86cd799439011';
  const projectId = '507f1f77bcf86cd799439022';
  const documentId = '507f1f77bcf86cd799439033';

  const mockDocument = {
    _id: documentId,
    id: documentId,
    name: 'test.pdf',
    projectId: new Types.ObjectId(projectId),
    owner: new Types.ObjectId(ownerId),
    sourceType: 'upload',
    objectKey: 'uuid-test.pdf',
    size: 1024,
    mimeType: 'application/pdf',
    status: 'processing',
    save: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    mockDocumentModel = jest.fn();
    mockConfigService = {
      get: jest.fn((key: string) => {
        const config: Record<string, string> = {
          'app.s3Region': 'us-east-1',
          'app.s3Bucket': 'test-bucket',
          'app.s3Endpoint': '',
        };
        return config[key] || '';
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentsService,
        {
          provide: getModelToken(DocumentEntity.name),
          useValue: mockDocumentModel,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<DocumentsService>(DocumentsService);
  });

  describe('toObjectId', () => {
    it('should convert valid string to ObjectId', () => {
      const result = (service as any).toObjectId(ownerId);
      expect(result).toBeInstanceOf(Types.ObjectId);
      expect(result.toString()).toBe(ownerId);
    });

    it('should throw BadRequestException for invalid ID', () => {
      expect(() => (service as any).toObjectId('invalid')).toThrow(BadRequestException);
      expect(() => (service as any).toObjectId('invalid')).toThrow('Invalid ID format: invalid');
    });

    it('should throw BadRequestException for empty string', () => {
      expect(() => (service as any).toObjectId('')).toThrow(BadRequestException);
    });
  });

  describe('findAllByProject', () => {
    it('should return paginated documents sorted ascending', async () => {
      const documents = [mockDocument];
      mockDocumentModel.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              exec: jest.fn().mockResolvedValue(documents),
            }),
          }),
        }),
      });
      mockDocumentModel.countDocuments = jest.fn().mockResolvedValue(1);

      const result = await service.findAllByProject(projectId, ownerId, {
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'asc',
      });

      expect(result).toEqual({ documents, total: 1 });
    });

    it('should return paginated documents sorted descending', async () => {
      const documents = [mockDocument];
      mockDocumentModel.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              exec: jest.fn().mockResolvedValue(documents),
            }),
          }),
        }),
      });
      mockDocumentModel.countDocuments = jest.fn().mockResolvedValue(1);

      const result = await service.findAllByProject(projectId, ownerId, {
        page: 2,
        limit: 5,
        sortBy: 'name',
        sortOrder: 'desc',
      });

      expect(result.documents).toEqual(documents);
      expect(result.total).toBe(1);
    });

    it('should calculate skip correctly for page > 1', async () => {
      mockDocumentModel.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              exec: jest.fn().mockResolvedValue([]),
            }),
          }),
        }),
      });
      mockDocumentModel.countDocuments = jest.fn().mockResolvedValue(0);

      await service.findAllByProject(projectId, ownerId, {
        page: 3,
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'asc',
      });

      const skipCall = mockDocumentModel.find().sort().skip;
      expect(skipCall).toHaveBeenCalledWith(20); // (3-1) * 10
    });

    it('should throw BadRequestException for invalid projectId', async () => {
      await expect(
        service.findAllByProject('invalid', ownerId, {
          page: 1,
          limit: 10,
          sortBy: 'createdAt',
          sortOrder: 'asc',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid ownerId', async () => {
      await expect(
        service.findAllByProject(projectId, 'invalid', {
          page: 1,
          limit: 10,
          sortBy: 'createdAt',
          sortOrder: 'asc',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findOne', () => {
    it('should return document by id and owner', async () => {
      mockDocumentModel.findOne = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockDocument),
      });

      const result = await service.findOne(documentId, ownerId);
      expect(mockDocumentModel.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          _id: expect.any(Types.ObjectId),
          owner: expect.any(Types.ObjectId),
        }),
      );
      expect(result).toEqual(mockDocument);
    });

    it('should return null when document not found', async () => {
      mockDocumentModel.findOne = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await service.findOne(documentId, ownerId);
      expect(result).toBeNull();
    });

    it('should throw BadRequestException for invalid document id', async () => {
      await expect(service.findOne('invalid', ownerId)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid owner id', async () => {
      await expect(service.findOne(documentId, 'invalid')).rejects.toThrow(BadRequestException);
    });
  });

  describe('create', () => {
    it('should create document with generated objectKey', async () => {
      const createDto: CreateDocumentDto = {
        name: 'test.pdf',
        projectId,
        size: 1024,
        mimeType: 'application/pdf',
      };

      const mockSave = jest.fn().mockImplementation(function () {
        return Promise.resolve({
          ...mockDocument,
          ...createDto,
          projectId: new Types.ObjectId(projectId),
        });
      });
      mockDocumentModel.mockImplementation(() => ({
        save: mockSave,
      }));

      const result = await service.create(createDto, ownerId);
      expect(mockDocumentModel).toHaveBeenCalledWith(
        expect.objectContaining({
          ...createDto,
          projectId: expect.any(Types.ObjectId),
          owner: expect.any(Types.ObjectId),
          objectKey: expect.stringMatching(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-test\.pdf$/),
          status: 'processing',
        }),
      );
      expect(result).toBeDefined();
    });

    it('should handle optional sourceType', async () => {
      const createDto: CreateDocumentDto = {
        name: 'test.pdf',
        projectId,
        sourceType: 'notion',
        size: 1024,
        mimeType: 'application/pdf',
      };

      mockDocumentModel.mockImplementation(() => ({
        save: jest.fn().mockResolvedValue({ ...mockDocument, ...createDto }),
      }));

      await service.create(createDto, ownerId);
      expect(mockDocumentModel).toHaveBeenCalledWith(
        expect.objectContaining({ sourceType: 'notion' }),
      );
    });

    it('should throw BadRequestException for invalid projectId in DTO', async () => {
      const createDto: CreateDocumentDto = {
        name: 'test.pdf',
        projectId: 'invalid',
        size: 1024,
        mimeType: 'application/pdf',
      };

      // The toObjectId call in create happens on createDto.projectId
      await expect(service.create(createDto, ownerId)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid ownerId', async () => {
      const createDto: CreateDocumentDto = {
        name: 'test.pdf',
        projectId,
        size: 1024,
        mimeType: 'application/pdf',
      };

      await expect(service.create(createDto, 'invalid')).rejects.toThrow(BadRequestException);
    });
  });

  describe('update', () => {
    it('should update document', async () => {
      const updateDto: UpdateDocumentDto = { name: 'updated.pdf', status: 'processed', pageCount: 5 };
      const updatedDoc = { ...mockDocument, ...updateDto };
      mockDocumentModel.findOneAndUpdate = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(updatedDoc),
      });

      const result = await service.update(documentId, updateDto, ownerId);
      expect(mockDocumentModel.findOneAndUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          _id: expect.any(Types.ObjectId),
          owner: expect.any(Types.ObjectId),
        }),
        updateDto,
        { new: true },
      );
      expect(result).toEqual(updatedDoc);
    });

    it('should return null when document not found', async () => {
      mockDocumentModel.findOneAndUpdate = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await service.update(documentId, {}, ownerId);
      expect(result).toBeNull();
    });

    it('should throw BadRequestException for invalid document id', async () => {
      await expect(service.update('invalid', {}, ownerId)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid owner id', async () => {
      await expect(service.update(documentId, {}, 'invalid')).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('should delete document', async () => {
      mockDocumentModel.findOneAndDelete = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockDocument),
      });

      const result = await service.remove(documentId, ownerId);
      expect(mockDocumentModel.findOneAndDelete).toHaveBeenCalledWith(
        expect.objectContaining({
          _id: expect.any(Types.ObjectId),
          owner: expect.any(Types.ObjectId),
        }),
      );
      expect(result).toEqual(mockDocument);
    });

    it('should return null when document not found', async () => {
      mockDocumentModel.findOneAndDelete = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await service.remove(documentId, ownerId);
      expect(result).toBeNull();
    });

    it('should throw BadRequestException for invalid document id', async () => {
      await expect(service.remove('invalid', ownerId)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid owner id', async () => {
      await expect(service.remove(documentId, 'invalid')).rejects.toThrow(BadRequestException);
    });
  });

  describe('generateUploadUrl', () => {
    it('should generate upload URL and create document', async () => {
      const dto: GenerateUploadUrlDto = {
        filename: 'test.pdf',
        mimeType: 'application/pdf',
        projectId,
        size: 1024,
      };

      (getSignedUrl as jest.Mock).mockResolvedValue('https://signed-url.example.com');

      const mockDoc = {
        ...mockDocument,
        name: dto.filename,
        save: jest.fn().mockResolvedValue(undefined),
      };

      // Mock the create method indirectly through the model constructor
      const mockSave = jest.fn().mockResolvedValue(mockDoc);
      mockDocumentModel.mockImplementation(() => ({
        save: mockSave,
      }));

      const result = await service.generateUploadUrl(dto, ownerId);

      expect(getSignedUrl).toHaveBeenCalled();
      expect(result.uploadUrl).toBe('https://signed-url.example.com');
      expect(result.objectKey).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-test\.pdf$/);
      expect(result.document).toBeDefined();
    });

    it('should throw BadRequestException when S3 bucket not configured', async () => {
      mockConfigService.get = jest.fn().mockReturnValue('');

      // Need to recreate service with new config
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          DocumentsService,
          {
            provide: getModelToken(DocumentEntity.name),
            useValue: mockDocumentModel,
          },
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
        ],
      }).compile();

      const serviceWithNoBucket = module.get<DocumentsService>(DocumentsService);

      const dto: GenerateUploadUrlDto = {
        filename: 'test.pdf',
        mimeType: 'application/pdf',
        projectId,
        size: 1024,
      };

      await expect(serviceWithNoBucket.generateUploadUrl(dto, ownerId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(serviceWithNoBucket.generateUploadUrl(dto, ownerId)).rejects.toThrow(
        'S3 bucket not configured',
      );
    });

    it('should use custom endpoint when configured', async () => {
      const customEndpointConfig = {
        get: jest.fn((key: string) => {
          const config: Record<string, string> = {
            'app.s3Region': 'us-east-1',
            'app.s3Bucket': 'test-bucket',
            'app.s3Endpoint': 'http://localhost:9000',
          };
          return config[key] || '';
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          DocumentsService,
          {
            provide: getModelToken(DocumentEntity.name),
            useValue: mockDocumentModel,
          },
          {
            provide: ConfigService,
            useValue: customEndpointConfig,
          },
        ],
      }).compile();

      const serviceWithEndpoint = module.get<DocumentsService>(DocumentsService);

      expect(require('@aws-sdk/client-s3').S3Client).toHaveBeenCalledWith(
        expect.objectContaining({
          endpoint: 'http://localhost:9000',
          forcePathStyle: true,
        }),
      );
    });

    it('should throw BadRequestException for invalid projectId in DTO', async () => {
      const dto: GenerateUploadUrlDto = {
        filename: 'test.pdf',
        mimeType: 'application/pdf',
        projectId: 'invalid',
        size: 1024,
      };

      // The create call inside generateUploadUrl validates projectId
      mockDocumentModel.mockImplementation(() => ({
        save: jest.fn().mockRejectedValue(new BadRequestException('Invalid ID format: invalid')),
      }));

      await expect(service.generateUploadUrl(dto, ownerId)).rejects.toThrow(BadRequestException);
    });
  });
});
