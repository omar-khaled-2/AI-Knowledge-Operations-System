import { IsString, IsOptional, MaxLength, IsNumber, Min } from 'class-validator';

export class UpdateSessionDto {
  @IsString()
  @IsOptional()
  @MaxLength(200)
  name?: string;

  @IsString()
  @IsOptional()
  preview?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  messageCount?: number;
}
