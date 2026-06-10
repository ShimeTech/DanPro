import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateWbsItemDto {
  @IsInt()
  projectId: number;

  @IsOptional()
  @IsInt()
  parentId?: number | null;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}