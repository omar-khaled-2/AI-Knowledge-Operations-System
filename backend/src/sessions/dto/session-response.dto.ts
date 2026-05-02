import { Exclude, Expose, Transform } from 'class-transformer';
import { Types } from 'mongoose';

@Exclude()
export class SessionResponseDto {
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
  messageCount: number;

  @Expose()
  preview?: string;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;
}
