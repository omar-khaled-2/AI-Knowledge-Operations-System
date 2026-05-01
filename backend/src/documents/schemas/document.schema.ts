import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type DocumentDocument = HydratedDocument<Document>;

@Schema({ timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } })
export class Document {
  @Prop({ required: true })
  name: string;

  @Prop({ type: Types.ObjectId, ref: 'Project', required: true, index: true })
  projectId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  owner: Types.ObjectId;

  @Prop({
    required: true,
    enum: ['upload', 'notion', 'slack', 'google-drive', 'confluence', 'github'],
    default: 'upload',
  })
  sourceType: string;

  @Prop({ required: true })
  objectKey: string;

  @Prop({ required: true })
  size: number;

  @Prop({ required: true })
  mimeType: string;

  @Prop({
    required: true,
    enum: ['processing', 'processed', 'error'],
    default: 'processing',
  })
  status: string;

  @Prop()
  pageCount?: number;
}

export const DocumentSchema = SchemaFactory.createForClass(Document);

DocumentSchema.virtual('id').get(function() {
  return this._id.toString();
});
