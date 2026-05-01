import { IsString, IsNotEmpty, MaxLength, IsIn, IsOptional, IsNumber, Min } from 'class-validator';

export class CreateDocumentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  name: string;

  @IsString()
  @IsNotEmpty()
  projectId: string;

  @IsString()
  @IsOptional()
  @IsIn(['upload', 'notion', 'slack', 'google-drive', 'confluence', 'github'])
  sourceType?: string;

  @IsNumber()
  @Min(0)
  size: number;

  @IsString()
  @IsNotEmpty()
  mimeType: string;
}
