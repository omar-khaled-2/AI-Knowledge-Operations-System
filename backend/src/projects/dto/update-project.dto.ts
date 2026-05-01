import { IsString, IsOptional, MaxLength, IsIn } from 'class-validator';

export class UpdateProjectDto {
  @IsString()
  @IsOptional()
  @MaxLength(200)
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  description?: string;

  @IsString()
  @IsOptional()
  @IsIn(['pink', 'teal', 'lavender', 'peach', 'ochre', 'cream'])
  color?: string;
}
