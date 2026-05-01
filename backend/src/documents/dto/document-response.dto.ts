import { Exclude, Expose, Transform } from 'class-transformer';
import { Types } from 'mongoose';

@Exclude()
export class DocumentResponseDto {
  @Expose()
  id: string;

  @Expose()
  name: string;

  @Expose()
  @Transform(({ value }) => {
    if (value instanceof Types.ObjectId) {
      return value.toString();
    }
    return value;
  })
  projectId: string;

  @Expose()
  sourceType: string;

  @Expose()
  objectKey: string;

  @Expose()
  size: number;

  @Expose()
  mimeType: string;

  @Expose()
  status: string;

  @Expose()
  pageCount?: number;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;
}
