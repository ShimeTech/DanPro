import {
  IsArray,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateDailyReportDto {
  @IsNumber()
  projectId!: number;

  @IsDateString()
  reportDate!: string;

  @IsOptional()
  @IsString()
  weather?: string;

  @IsOptional()
  @IsNumber()
  manpowerCount?: number;

  @IsOptional()
  @IsString()
  equipmentUsed?: string;

  @IsOptional()
  @IsString()
  workCompleted?: string;

  @IsOptional()
  @IsString()
  materialReceived?: string;

  @IsOptional()
  @IsArray()
  sitePhotos?: string[];

  @IsOptional()
  @IsString()
  issues?: string;

  @IsOptional()
  @IsString()
  delays?: string;

  @IsOptional()
  @IsString()
  remarks?: string;
}