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
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { AuthGuard } from '../auth/guards/auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { GenerateUploadUrlDto } from './dto/generate-upload-url.dto';

@Controller('documents')
@UseGuards(AuthGuard)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  /**
   * Safely extract and validate the user ID from the auth session.
   * better-auth may return user.id, user._id, or user.userId depending on version.
   */
  private getUserId(user: any): string {
    if (!user) {
      throw new UnauthorizedException('User not authenticated');
    }

    const userId = user.id || user._id || user.userId;

    if (!userId) {
      throw new UnauthorizedException('User ID not found in session');
    }

    const idString = userId.toString();

    if (!Types.ObjectId.isValid(idString)) {
      throw new BadRequestException(`Invalid user ID format: ${idString}`);
    }

    return idString;
  }

  @Get()
  async findAll(
    @Query('projectId') projectId: string,
    @Query('page') pageStr: string,
    @Query('limit') limitStr: string,
    @Query('sortBy') sortBy: string,
    @Query('sortOrder') sortOrder: string,
    @CurrentUser() user: any,
  ) {
    if (!projectId) {
      throw new BadRequestException('projectId query parameter is required');
    }

    const page = Math.max(1, parseInt(pageStr, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(limitStr, 10) || 12));
    const sortByField = sortBy || 'createdAt';
    const sortOrderValue = sortOrder === 'asc' ? 'asc' : 'desc';

    const userId = this.getUserId(user);
    const result = await this.documentsService.findAllByProject(projectId, userId, {
      page,
      limit,
      sortBy: sortByField,
      sortOrder: sortOrderValue,
    });

    const totalPages = Math.ceil(result.total / limit);

    return {
      success: true,
      data: {
        documents: result.documents,
        pagination: {
          total: result.total,
          page,
          limit,
          totalPages,
        },
      },
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    const userId = this.getUserId(user);
    const document = await this.documentsService.findOne(id, userId);
    if (!document) {
      throw new NotFoundException('Document not found');
    }
    return { success: true, data: document };
  }

  @Post()
  async create(@Body() createDocumentDto: CreateDocumentDto, @CurrentUser() user: any) {
    const userId = this.getUserId(user);
    const document = await this.documentsService.create(createDocumentDto, userId);
    return { success: true, data: document };
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateDocumentDto: UpdateDocumentDto, @CurrentUser() user: any) {
    const userId = this.getUserId(user);
    const document = await this.documentsService.update(id, updateDocumentDto, userId);
    if (!document) {
      throw new NotFoundException('Document not found');
    }
    return { success: true, data: document };
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentUser() user: any) {
    const userId = this.getUserId(user);
    const document = await this.documentsService.remove(id, userId);
    if (!document) {
      throw new NotFoundException('Document not found');
    }
    return { success: true, data: document };
  }

  @Post('upload-url')
  async generateUploadUrl(@Body() generateUploadUrlDto: GenerateUploadUrlDto, @CurrentUser() user: any) {
    const userId = this.getUserId(user);
    const result = await this.documentsService.generateUploadUrl(generateUploadUrlDto, userId);
    return { success: true, data: result };
  }
}
