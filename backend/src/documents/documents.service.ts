import { Injectable, BadRequestException, Logger } from '@nestjs/common';
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
import { DocumentEmbeddedEvent } from './events/document-embedded.event';
import { WebSocketPublisher } from '../websocket/websocket-publisher.service';
import { WSMessage, DocumentStatusPayload } from '../websocket/types';
import { randomUUID } from 'crypto';

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);
  private s3Client: S3Client;

  constructor(
    @InjectModel(DocumentEntity.name) private documentModel: Model<DocumentDocument>,
    private configService: ConfigService,
    private eventEmitter: EventEmitter2,
    private wsPublisher: WebSocketPublisher,
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
      this.logger.warn(`Invalid ID format: ${id}`);
      throw new BadRequestException(`Invalid ID format: ${id}`);
    }
    return new Types.ObjectId(id);
  }

  async findAllByProject(
    projectId: string,
    ownerId: string,
    options: { page: number; limit: number; sortBy: string; sortOrder: 'asc' | 'desc' },
  ): Promise<{ documents: DocumentEntity[]; total: number }> {
    this.logger.debug(`Fetching documents for project: ${projectId}, owner: ${ownerId}`);
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

    this.logger.debug(`Retrieved ${documents.length} documents (total: ${total}) for project: ${projectId}`);
    return { documents, total };
  }

  async findOne(id: string, ownerId: string): Promise<DocumentEntity | null> {
    this.logger.debug(`Fetching document: id=${id}, ownerId=${ownerId}`);
    return this.documentModel
      .findOne({
        _id: this.toObjectId(id),
        owner: this.toObjectId(ownerId),
      })
      .exec();
  }

  async create(createDocumentDto: CreateDocumentDto, ownerId: string): Promise<DocumentDocument> {
    this.logger.log(`Creating document for project: ${createDocumentDto.projectId}, owner: ${ownerId}`);
    const createdDocument = new this.documentModel({
      ...createDocumentDto,
      projectId: this.toObjectId(createDocumentDto.projectId),
      owner: this.toObjectId(ownerId),
      status: 'processing',
    });

    const savedDocument = await createdDocument.save();
    this.logger.log(`Document created successfully: id=${savedDocument._id}, projectId=${createDocumentDto.projectId}`);

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

  async update(id: string, updateDocumentDto: UpdateDocumentDto, ownerId?: string): Promise<DocumentEntity | null> {
    this.logger.log(`Updating document: id=${id}, ownerId=${ownerId || 'system'}`);
    
    const filter: any = {
      _id: this.toObjectId(id),
    };
    
    if (ownerId) {
      filter.owner = this.toObjectId(ownerId);
    }
    
    const updatedDocument = await this.documentModel
      .findOneAndUpdate(
        filter,
        {
          ...updateDocumentDto,
        },
        { new: true },
      )
      .exec();

    if (updatedDocument) {
      this.logger.log(`Document updated successfully: id=${id}`);
    } else {
      this.logger.warn(`Document not found for update: id=${id}, ownerId=${ownerId}`);
    }

    // After successful update, publish WebSocket event
    if (updateDocumentDto.status && updatedDocument) {
      await this.publishDocumentStatus(
        updatedDocument.owner.toString(),
        id,
        updateDocumentDto.status as DocumentStatusPayload['status'],
      );
    }

    // Emit event when document is fully embedded
    if (updateDocumentDto.status === 'embedded' && updatedDocument) {
      this.eventEmitter.emit(
        'document.embedded',
        new DocumentEmbeddedEvent(
          updatedDocument._id.toString(),
          updatedDocument.projectId.toString(),
          updatedDocument.owner.toString(),
          updatedDocument.name,
          updatedDocument.mimeType,
        ),
      );
    }

    return updatedDocument;
  }

  async publishDocumentStatus(
    userId: string,
    documentId: string,
    status: DocumentStatusPayload['status'],
    options?: { progress?: number; error?: string },
  ): Promise<void> {
    const event: WSMessage<'document.status', DocumentStatusPayload> = {
      event: 'document.status',
      version: '1.0',
      timestamp: new Date().toISOString(),
      userId,
      payload: {
        documentId,
        status,
        ...(options?.progress !== undefined && { progress: options.progress }),
        ...(options?.error && { error: options.error }),
      },
    };

    await this.wsPublisher.sendToUser(userId, event);
  }

  async remove(id: string, ownerId: string): Promise<DocumentEntity | null> {
    this.logger.log(`Deleting document: id=${id}, ownerId=${ownerId}`);
    const deletedDocument = await this.documentModel
      .findOneAndDelete({
        _id: this.toObjectId(id),
        owner: this.toObjectId(ownerId),
      })
      .exec();

    if (deletedDocument) {
      this.logger.log(`Document deleted successfully: id=${id}`);
    } else {
      this.logger.warn(`Document not found for deletion: id=${id}, ownerId=${ownerId}`);
    }

    return deletedDocument;
  }

  async generateUploadUrl(
    dto: GenerateUploadUrlDto,
  ): Promise<{ uploadUrl: string; objectKey: string }> {
    this.logger.log(`Generating upload URL for file: ${dto.filename}`);
    const bucket = this.configService.get<string>('app.s3Bucket');
    if (!bucket) {
      this.logger.error('S3 bucket not configured');
      throw new BadRequestException('S3 bucket not configured');
    }

    const objectKey = `${randomUUID()}-${dto.filename}`;

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: objectKey,
      ContentType: dto.mimeType,
      ContentLength: dto.size,
    });

    try {
      const uploadUrl = await getSignedUrl(this.s3Client, command, { expiresIn: 300 });
      this.logger.log(`Generated upload URL for objectKey: ${objectKey}`);
      return { uploadUrl, objectKey };
    } catch (error) {
      this.logger.error(
        `Failed to generate upload URL: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }
}
