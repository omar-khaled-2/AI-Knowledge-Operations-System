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
} from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { InsightsService } from './insights.service';
import { UpdateInsightStatusDto } from './dto/update-insight-status.dto';
import { InsightResponseDto } from './dto/insight-response.dto';
import { plainToInstance } from 'class-transformer';

@Controller('insights')
@UseGuards(AuthGuard)
export class InsightsController {
  private readonly logger = new Logger(InsightsController.name);

  constructor(private readonly insightsService: InsightsService) {}

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
