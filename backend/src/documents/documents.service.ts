import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Document as DocumentEntity, DocumentDocument } from './schemas/document.schema';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { GenerateUploadUrlDto } from './dto/generate-upload-url.dto';
import { DocumentCreatedEvent } from './events/document-created.event';
import { randomUUID } from 'crypto';

@Injectable()
export class DocumentsService {
  private s3Client: S3Client;

  constructor(
    @InjectModel(DocumentEntity.name) private documentModel: Model<DocumentDocument>,
    private configService: ConfigService,
    private eventEmitter: EventEmitter2,
  ) {
    const region = this.configService.get<string>('app.s3Region');
    const endpoint = this.configService.get<string>('app.s3Endpoint');

    this.s3Client = new S3Client({
      region: region || 'us-east-1',
      ...(endpoint ? { endpoint, forcePathStyle: true } : {}),
    });
  }

  private toObjectId(id: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Invalid ID format: ${id}`);
    }
    return new Types.ObjectId(id);
  }

  async findAllByProject(
    projectId: string,
    ownerId: string,
    options: { page: number; limit: number; sortBy: string; sortOrder: 'asc' | 'desc' },
  ): Promise<{ documents: DocumentEntity[]; total: number }> {
    const skip = (options.page - 1) * options.limit;
    const sortDirection = options.sortOrder === 'asc' ? 1 : -1;
    const sort: Record<string, 1 | -1> = { [options.sortBy]: sortDirection };

    const filter = {
      projectId: this.toObjectId(projectId),
      owner: this.toObjectId(ownerId),
    };

    const [documents, total] = await Promise.all([
      this.documentModel
        .find(filter)
        .sort(sort)
        .skip(skip)
        .limit(options.limit)
        .exec(),
      this.documentModel.countDocuments(filter),
    ]);

    return { documents, total };
  }

  async findOne(id: string, ownerId: string): Promise<DocumentEntity | null> {
    return this.documentModel
      .findOne({
        _id: this.toObjectId(id),
        owner: this.toObjectId(ownerId),
      })
      .exec();
  }

  async create(createDocumentDto: CreateDocumentDto, ownerId: string): Promise<DocumentDocument> {
    const createdDocument = new this.documentModel({
      ...createDocumentDto,
      projectId: this.toObjectId(createDocumentDto.projectId),
      owner: this.toObjectId(ownerId),
      status: 'processing',
    });

    const savedDocument = await createdDocument.save();

    // Emit event for document processor
    this.eventEmitter.emit(
      'document.created',
      new DocumentCreatedEvent(
        savedDocument._id.toString(),
        savedDocument.projectId.toString(),
        savedDocument.owner.toString(),
        savedDocument.objectKey,
        savedDocument.name,
        savedDocument.mimeType,
        savedDocument.size,
        savedDocument.sourceType,
      ),
    );

    return savedDocument;
  }

  async update(id: string, updateDocumentDto: UpdateDocumentDto, ownerId: string): Promise<DocumentEntity | null> {
    return this.documentModel
      .findOneAndUpdate(
        {
          _id: this.toObjectId(id),
          owner: this.toObjectId(ownerId),
        },
        {
          ...updateDocumentDto,
        },
        { new: true },
      )
      .exec();
  }

  async remove(id: string, ownerId: string): Promise<DocumentEntity | null> {
    return this.documentModel
      .findOneAndDelete({
        _id: this.toObjectId(id),
        owner: this.toObjectId(ownerId),
      })
      .exec();
  }

  async generateUploadUrl(
    dto: GenerateUploadUrlDto,
  ): Promise<{ uploadUrl: string; objectKey: string }> {
    const bucket = this.configService.get<string>('app.s3Bucket');
    if (!bucket) {
      throw new BadRequestException('S3 bucket not configured');
    }

    const objectKey = `${randomUUID()}-${dto.filename}`;

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: objectKey,
      ContentType: dto.mimeType,
      ContentLength: dto.size,
    });

    const uploadUrl = await getSignedUrl(this.s3Client, command, { expiresIn: 300 });

    return { uploadUrl, objectKey };
  }
}
