import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ProjectDocument = HydratedDocument<Project>;

@Schema({ timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } })
export class Project {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true, enum: ['pink', 'teal', 'lavender', 'peach', 'ochre', 'cream'] })
  color: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  owner: Types.ObjectId;

  @Prop({ default: 0 })
  documentCount: number;

  @Prop({ default: 0 })
  sourceCount: number;

  @Prop({ default: 0 })
  sessionCount: number;

  @Prop({ default: 0 })
  insightCount: number;

  @Prop({ default: () => new Date() })
  lastUpdated: Date;
}

export const ProjectSchema = SchemaFactory.createForClass(Project);

ProjectSchema.virtual('id').get(function() {
  return this._id.toString();
});
