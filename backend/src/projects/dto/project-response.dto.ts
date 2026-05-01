import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class ProjectResponseDto {
  @Expose()
  id: string;

  @Expose()
  name: string;

  @Expose()
  description: string;

  @Expose()
  color: string;

  @Expose()
  documentCount: number;

  @Expose()
  sourceCount: number;

  @Expose()
  sessionCount: number;

  @Expose()
  insightCount: number;

  @Expose()
  lastUpdated: Date;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;
}
