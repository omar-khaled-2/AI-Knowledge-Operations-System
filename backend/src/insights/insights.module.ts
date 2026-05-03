import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { ProjectsModule } from '../projects/projects.module';
import { InsightsService } from './insights.service';
import { InsightsController } from './insights.controller';
import { InternalInsightsController } from './internal-insights.controller';
import { Insight, InsightSchema } from './schemas/insight.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Insight.name, schema: InsightSchema },
    ]),
    AuthModule,
    ProjectsModule,
  ],
  controllers: [InsightsController, InternalInsightsController],
  providers: [InsightsService],
  exports: [InsightsService],
})
export class InsightsModule {}
