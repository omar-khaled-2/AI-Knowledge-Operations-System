import { IsString, IsNotEmpty, MaxLength, IsIn } from 'class-validator';

export class CreateProjectDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  description: string;

  @IsString()
  @IsIn(['pink', 'teal', 'lavender', 'peach', 'ochre', 'cream'])
  color: string;
}
