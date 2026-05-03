import { IsString, IsNumber, IsEnum, IsArray, Min, Max, ArrayMinSize, IsOptional } from 'class-validator';

export class CreateInsightDto {
  @IsString()
  type: string;

  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsNumber()
  @Min(0)
  @Max(1)
  confidence: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  relatedDocuments?: string[];
}
