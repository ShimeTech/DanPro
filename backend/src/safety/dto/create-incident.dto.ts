import { IsDateString, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

export enum SafetyIncidentSeverityDto {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum SafetyIncidentStatusDto {
  OPEN = 'OPEN',
  INVESTIGATING = 'INVESTIGATING',
  CLOSED = 'CLOSED',
}

export class CreateIncidentDto {
  @IsNumber()
  projectId!: number;

  @IsString()
  code!: string;

  @IsString()
  title!: string;

  @IsString()
  description!: string;

  @IsOptional()
  @IsEnum(SafetyIncidentSeverityDto)
  severity?: SafetyIncidentSeverityDto;

  @IsOptional()
  @IsEnum(SafetyIncidentStatusDto)
  status?: SafetyIncidentStatusDto;

  @IsDateString()
  incidentDate!: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  correctiveAction?: string;
}