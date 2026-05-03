import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type InsightDocument = HydratedDocument<Insight>;

@Schema({ timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } })
export class Insight {
  @Prop({ type: Types.ObjectId, ref: 'Project', required: true, index: true })
  projectId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Document', required: true, index: true })
  sourceDocumentId: Types.ObjectId;

  @Prop({
    required: true,
    enum: ['action-item', 'connection', 'trend', 'anomaly'],
  })
  type: string;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true, min: 0, max: 1 })
  confidence: number;

  @Prop({ type: [Types.ObjectId], ref: 'Document', default: [] })
  relatedDocuments: Types.ObjectId[];

  @Prop({
    required: true,
    enum: ['active', 'dismissed', 'resolved'],
    default: 'active',
  })
  status: string;

}

export const InsightSchema = SchemaFactory.createForClass(Insight);

InsightSchema.virtual('id').get(function() {
  return this._id.toString();
});

InsightSchema.index({ projectId: 1, status: 1 });
InsightSchema.index({ sourceDocumentId: 1 });
InsightSchema.index({ createdAt: -1 });
