import { IsDateString, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

export enum NcrStatusDto {
  OPEN = 'OPEN',
  UNDER_REVIEW = 'UNDER_REVIEW',
  CLOSED = 'CLOSED',
}

export class CreateNcrDto {
  @IsNumber()
  projectId!: number;

  @IsString()
  code!: string;

  @IsString()
  title!: string;

  @IsString()
  description!: string;

  @IsOptional()
  @IsEnum(NcrStatusDto)
  status?: NcrStatusDto;

  @IsOptional()
  @IsString()
  correctiveAction?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsNumber()
  assignedToId?: number;
}