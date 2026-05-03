import { Exclude, Expose, Transform } from 'class-transformer';

@Exclude()
export class InsightResponseDto {
  @Expose()
  @Transform(({ obj }) => obj._id.toString())
  id: string;

  @Expose()
  @Transform(({ obj }) => obj.projectId.toString())
  projectId: string;

  @Expose()
  @Transform(({ obj }) => obj.sourceDocumentId.toString())
  sourceDocumentId: string;

  @Expose()
  type: string;

  @Expose()
  title: string;

  @Expose()
  description: string;

  @Expose()
  confidence: number;

  @Expose()
  @Transform(({ obj }) => obj.relatedDocuments?.map((id: any) => id.toString()))
  relatedDocuments: string[];

  @Expose()
  status: string;

  @Expose()
  createdAt: Date;
}
