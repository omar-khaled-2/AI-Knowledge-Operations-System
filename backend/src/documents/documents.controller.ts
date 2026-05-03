import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Logger,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { Types } from "mongoose";
import { AuthGuard } from "../auth/guards/auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { DocumentsService } from "./documents.service";
import { ProjectsService } from "../projects/projects.service";
import { CreateDocumentDto } from "./dto/create-document.dto";
import { UpdateDocumentDto } from "./dto/update-document.dto";
import { GenerateUploadUrlDto } from "./dto/generate-upload-url.dto";
import { DocumentResponseDto } from "./dto/document-response.dto";
import { plainToInstance } from "class-transformer";

@Controller("documents")
export class DocumentsController {
  private readonly logger = new Logger(DocumentsController.name);

  constructor(
    private readonly documentsService: DocumentsService,
    private readonly projectsService: ProjectsService,
  ) {}

  /**
   * Safely extract and validate the user ID from the auth session.
   * better-auth may return user.id, user._id, or user.userId depending on version.
   */
  private getUserId(user: any): string {
    if (!user) {
      this.logger.warn('Authentication failed: user not found in request');
      throw new UnauthorizedException("User not authenticated");
    }

    const userId = user.id || user._id || user.userId;

    if (!userId) {
      this.logger.warn('Authentication failed: user ID not found in session');
      throw new UnauthorizedException("User ID not found in session");
    }

    const idString = userId.toString();

    if (!Types.ObjectId.isValid(idString)) {
      this.logger.warn(`Invalid user ID format: ${idString}`);
      throw new BadRequestException(`Invalid user ID format: ${idString}`);
    }

    return idString;
  }

  /**
   * Verify that the project exists and belongs to the authenticated user.
   * Prevents IDOR attacks where users create documents in other users' projects.
   */
  private async verifyProjectOwnership(
    projectId: string,
    userId: string,
  ): Promise<void> {
    const project = await this.projectsService.findOne(projectId, userId);
    if (!project) {
      this.logger.warn(`Project ownership verification failed: projectId=${projectId}, userId=${userId}`);
      throw new ForbiddenException("Project not found or access denied");
    }
  }

  @Get()
  @UseGuards(AuthGuard)
  async findAll(
    @Query("projectId") projectId: string,
    @Query("page") pageStr: string,
    @Query("limit") limitStr: string,
    @Query("sortBy") sortBy: string,
    @Query("sortOrder") sortOrder: string,
    @CurrentUser() user: any,
  ) {
    if (!projectId) {
      this.logger.warn('Missing projectId query parameter');
      throw new BadRequestException("projectId query parameter is required");
    }

    const page = Math.max(1, parseInt(pageStr, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(limitStr, 10) || 12));
    const sortByField = sortBy || "createdAt";
    const sortOrderValue = sortOrder === "asc" ? "asc" : "desc";

    const userId = this.getUserId(user);
    this.logger.debug(`Fetching documents for project: ${projectId}, userId=${userId}, page=${page}, limit=${limit}`);
    
    const result = await this.documentsService.findAllByProject(
      projectId,
      userId,
      {
        page,
        limit,
        sortBy: sortByField,
        sortOrder: sortOrderValue,
      },
    );

    this.logger.log(`Retrieved ${result.documents.length} documents (total: ${result.total}) for project: ${projectId}`);
    return {
      data: plainToInstance(DocumentResponseDto, result.documents),
      total: result.total,
    };
  }

  @Get(":id")
  @UseGuards(AuthGuard)
  async findOne(@Param("id") id: string, @CurrentUser() user: any) {
    const userId = this.getUserId(user);
    this.logger.debug(`Fetching document: id=${id}, userId=${userId}`);
    
    const document = await this.documentsService.findOne(id, userId);
    if (!document) {
      this.logger.warn(`Document not found: id=${id}, userId=${userId}`);
      throw new NotFoundException("Document not found");
    }
    
    this.logger.log(`Retrieved document: id=${id}`);
    return plainToInstance(DocumentResponseDto, document);
  }

  @Post()
  @UseGuards(AuthGuard)
  async create(
    @Body() createDocumentDto: CreateDocumentDto,
    @CurrentUser() user: any,
  ) {
    const userId = this.getUserId(user);
    this.logger.log(`Creating document for project: ${createDocumentDto.projectId}, userId=${userId}`);
    
    await this.verifyProjectOwnership(createDocumentDto.projectId, userId);
    const document = await this.documentsService.create(
      createDocumentDto,
      userId,
    );
    
    this.logger.log(`Document created: id=${document._id}, projectId=${createDocumentDto.projectId}`);
    return plainToInstance(DocumentResponseDto, document);
  }

  @Patch(":id")
  async update(
    @Param("id") id: string,
    @Body() updateDocumentDto: UpdateDocumentDto,
    @CurrentUser() user: any,
  ) {
    // If no authenticated user, allow system/service updates (MVP - no auth)
    const userId = user ? this.getUserId(user) : undefined;
    this.logger.log(`Updating document: id=${id}, userId=${userId || 'system'}`);
    
    const document = await this.documentsService.update(
      id,
      updateDocumentDto,
      userId,
    );
    if (!document) {
      this.logger.warn(`Document not found for update: id=${id}, userId=${userId || 'system'}`);
      throw new NotFoundException("Document not found");
    }
    
    this.logger.log(`Document updated: id=${id}`);
    return plainToInstance(DocumentResponseDto, document);
  }

  @Delete(":id")
  @UseGuards(AuthGuard)
  async remove(@Param("id") id: string, @CurrentUser() user: any) {
    const userId = this.getUserId(user);
    this.logger.log(`Deleting document: id=${id}, userId=${userId}`);
    
    const document = await this.documentsService.remove(id, userId);
    if (!document) {
      this.logger.warn(`Document not found for deletion: id=${id}, userId=${userId}`);
      throw new NotFoundException("Document not found");
    }
    
    this.logger.log(`Document deleted: id=${id}`);
    return plainToInstance(DocumentResponseDto, document);
  }

  @Post("upload-url")
  @UseGuards(AuthGuard)
  async generateUploadUrl(
    @Body() generateUploadUrlDto: GenerateUploadUrlDto,
    @CurrentUser() user: any,
  ) {
    const userId = this.getUserId(user);
    this.logger.log(`Generating upload URL for project: ${generateUploadUrlDto.projectId}, userId=${userId}`);
    
    await this.verifyProjectOwnership(generateUploadUrlDto.projectId, userId);
    const result = await this.documentsService.generateUploadUrl(generateUploadUrlDto);
    
    this.logger.log(`Upload URL generated for project: ${generateUploadUrlDto.projectId}`);
    return result;
  }

  @Get(":id/download-url")
  @UseGuards(AuthGuard)
  async generateDownloadUrl(
    @Param("id") id: string,
    @CurrentUser() user: any,
  ) {
    const userId = this.getUserId(user);
    this.logger.log(`Generating download URL for document: ${id}, userId=${userId}`);
    
    const result = await this.documentsService.generateDownloadUrl(id, userId);
    
    this.logger.log(`Download URL generated for document: ${id}`);
    return result;
  }
}
