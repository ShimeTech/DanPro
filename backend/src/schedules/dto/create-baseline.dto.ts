import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateBaselineDto {
  @IsInt()
  projectId: number;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;
}