import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Insight, InsightDocument } from './schemas/insight.schema';
import { CreateInsightsBatchDto } from './dto/create-insights-batch.dto';
import { UpdateInsightStatusDto } from './dto/update-insight-status.dto';

@Injectable()
export class InsightsService {
  private readonly logger = new Logger(InsightsService.name);

  constructor(
    @InjectModel(Insight.name) private insightModel: Model<InsightDocument>,
  ) {}

  async createBatch(dto: CreateInsightsBatchDto): Promise<{ createdCount: number }> {
    const projectId = new Types.ObjectId(dto.projectId);
    const sourceDocumentId = new Types.ObjectId(dto.sourceDocumentId);

    const insights = dto.insights.map((insight) => ({
      projectId,
      sourceDocumentId,
      type: insight.type,
      title: insight.title,
      description: insight.description,
      confidence: insight.confidence,
      relatedDocuments: insight.relatedDocuments?.map((id) => new Types.ObjectId(id)) || [],
      status: 'active' as const,
    }));

    this.logger.log(`Creating ${insights.length} insights for document ${dto.sourceDocumentId}: ${JSON.stringify(insights.map(i => ({ type: i.type, title: i.title, confidence: i.confidence })))}`);
    const result = await this.insightModel.create(insights);
    this.logger.log(`Created ${result.length} insights for document ${dto.sourceDocumentId}`);

    return { createdCount: result.length };
  }

  async findAllByProject(
    projectId: string,
    options: {
      status?: string;
      type?: string;
      page: number;
      limit: number;
    },
  ) {
    const skip = (options.page - 1) * options.limit;
    const filter: any = { projectId: new Types.ObjectId(projectId) };

    if (options.status) {
      filter.status = options.status;
    }

    if (options.type) {
      filter.type = options.type;
    }

    const [insights, total] = await Promise.all([
      this.insightModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(options.limit)
        .exec(),
      this.insightModel.countDocuments(filter),
    ]);

    return { insights, total };
  }

  async updateStatus(
    id: string,
    dto: UpdateInsightStatusDto,
  ): Promise<Insight | null> {
    return this.insightModel
      .findByIdAndUpdate(id, { status: dto.status }, { new: true })
      .exec();
  }
}
