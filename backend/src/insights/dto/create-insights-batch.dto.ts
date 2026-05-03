import { IsString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateInsightDto } from './create-insight.dto';

export class CreateInsightsBatchDto {
  @IsString()
  projectId: string;

  @IsString()
  sourceDocumentId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateInsightDto)
  insights: CreateInsightDto[];
}
