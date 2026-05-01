import { IsString, IsNotEmpty, IsNumber, Min } from 'class-validator';

export class GenerateUploadUrlDto {
  @IsString()
  @IsNotEmpty()
  filename: string;

  @IsString()
  @IsNotEmpty()
  mimeType: string;

  @IsString()
  @IsNotEmpty()
  projectId: string;

  @IsNumber()
  @Min(0)
  size: number;
}
