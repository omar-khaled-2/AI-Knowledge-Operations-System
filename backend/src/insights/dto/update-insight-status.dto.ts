import { IsEnum } from 'class-validator';

export class UpdateInsightStatusDto {
  @IsEnum(['active', 'dismissed', 'resolved'])
  status: string;
}
