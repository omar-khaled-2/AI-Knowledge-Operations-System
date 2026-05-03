import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Logger,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { AuthGuard } from '../auth/guards/auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { InsightsService } from './insights.service';
import { ProjectsService } from '../projects/projects.service';
import { UpdateInsightStatusDto } from './dto/update-insight-status.dto';
import { InsightResponseDto } from './dto/insight-response.dto';
import { plainToInstance } from 'class-transformer';

@Controller('insights')
@UseGuards(AuthGuard)
export class InsightsController {
  private readonly logger = new Logger(InsightsController.name);

  constructor(
    private readonly insightsService: InsightsService,
    private readonly projectsService: ProjectsService,
  ) {}

  /**
   * Safely extract and validate the user ID from the auth session.
   */
  private getUserId(user: any): string {
    if (!user) {
      this.logger.warn('Authentication failed: user not found in request');
      throw new UnauthorizedException('User not authenticated');
    }

    const userId = user.id || user._id || user.userId;

    if (!userId) {
      this.logger.warn('Authentication failed: user ID not found in session');
      throw new UnauthorizedException('User ID not found in session');
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
   * Prevents IDOR attacks where users access insights from other users' projects.
   */
  private async verifyProjectOwnership(
    projectId: string,
    userId: string,
  ): Promise<void> {
    const project = await this.projectsService.findOne(projectId, userId);
    if (!project) {
      this.logger.warn(`Project ownership verification failed: projectId=${projectId}, userId=${userId}`);
      throw new ForbiddenException('Project not found or access denied');
    }
  }

  @Get()
  async findAll(
    @Query('projectId') projectId: string,
    @Query('status') status: string,
    @Query('type') type: string,
    @Query('page') pageStr: string,
    @Query('limit') limitStr: string,
    @CurrentUser() user: any,
  ) {
    if (!projectId) {
      throw new BadRequestException('projectId query parameter is required');
    }

    const userId = this.getUserId(user);
    await this.verifyProjectOwnership(projectId, userId);

    const page = Math.max(1, parseInt(pageStr, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(limitStr, 10) || 20));

    const result = await this.insightsService.findAllByProject(projectId, {
      status,
      type,
      page,
      limit,
    });

    return {
      data: plainToInstance(InsightResponseDto, result.insights),
      total: result.total,
      page,
      limit,
    };
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateInsightStatusDto,
  ) {
    const insight = await this.insightsService.updateStatus(id, dto);
    if (!insight) {
      throw new NotFoundException('Insight not found');
    }
    return plainToInstance(InsightResponseDto, insight);
  }
}
