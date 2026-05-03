import { Controller, Post, Body, Logger } from '@nestjs/common';
import { InsightsService } from './insights.service';
import { CreateInsightsBatchDto } from './dto/create-insights-batch.dto';

@Controller('internal/insights')
export class InternalInsightsController {
  private readonly logger = new Logger(InternalInsightsController.name);

  constructor(private readonly insightsService: InsightsService) {}

  @Post()
  async createMany(@Body() dto: CreateInsightsBatchDto) {
    this.logger.log(`Received ${dto.insights.length} insights for document ${dto.sourceDocumentId}`);
    const result = await this.insightsService.createBatch(dto);
    return { success: true, ...result };
  }
}
