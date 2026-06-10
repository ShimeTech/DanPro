import { IsArray, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateChecklistDto {
  @IsNumber()
  projectId!: number;

  @IsString()
  code!: string;

  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  items?: any[];
}