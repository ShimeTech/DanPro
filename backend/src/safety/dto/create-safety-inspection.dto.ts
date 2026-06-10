import { IsDateString, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateSafetyInspectionDto {
  @IsNumber()
  projectId!: number;

  @IsString()
  code!: string;

  @IsDateString()
  inspectionDate!: string;

  @IsOptional()
  @IsString()
  findings?: string;

  @IsOptional()
  @IsString()
  actions?: string;

  @IsOptional()
  @IsNumber()
  inspectorId?: number;
}