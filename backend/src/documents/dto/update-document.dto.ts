import { IsString, IsOptional, MaxLength, IsIn, IsNumber, Min } from 'class-validator';

export class UpdateDocumentDto {
  @IsString()
  @IsOptional()
  @MaxLength(500)
  name?: string;

  @IsString()
  @IsOptional()
  @IsIn(['processing', 'processed', 'error'])
  status?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  pageCount?: number;
}
