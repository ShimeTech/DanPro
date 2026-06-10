import { IsDateString, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateRiskAssessmentDto {
  @IsNumber()
  projectId!: number;

  @IsString()
  code!: string;

  @IsString()
  activity!: string;

  @IsString()
  hazards!: string;

  @IsString()
  risks!: string;

  @IsOptional()
  @IsString()
  controls?: string;

  @IsOptional()
  @IsString()
  riskLevel?: string;

  @IsOptional()
  @IsDateString()
  reviewDate?: string;
}