import { IsDateString, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

export enum InspectionStatusDto {
  PLANNED = 'PLANNED',
  PASSED = 'PASSED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export class CreateInspectionDto {
  @IsNumber()
  projectId!: number;

  @IsOptional()
  @IsNumber()
  checklistId?: number;

  @IsString()
  code!: string;

  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsDateString()
  inspectionDate?: string;

  @IsOptional()
  @IsEnum(InspectionStatusDto)
  status?: InspectionStatusDto;

  @IsOptional()
  @IsString()
  result?: string;

  @IsOptional()
  @IsNumber()
  inspectorId?: number;
}