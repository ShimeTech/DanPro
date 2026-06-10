import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

export enum CostStatusDto {
  DRAFT = 'DRAFT',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

export class CreateBudgetDto {
  @IsNumber()
  projectId!: number;

  @IsString()
  code!: string;

  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  amount!: number;

  @IsOptional()
  @IsEnum(CostStatusDto)
  status?: CostStatusDto;
}