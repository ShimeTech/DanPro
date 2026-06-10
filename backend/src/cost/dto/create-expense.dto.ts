import { IsDateString, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

export enum ExpenseTypeDto {
  MATERIAL = 'MATERIAL',
  LABOR = 'LABOR',
  EQUIPMENT = 'EQUIPMENT',
  SUBCONTRACTOR = 'SUBCONTRACTOR',
  GENERAL = 'GENERAL',
  OTHER = 'OTHER',
}

export class CreateExpenseDto {
  @IsNumber()
  projectId!: number;

  @IsString()
  code!: string;

  @IsString()
  description!: string;

  @IsOptional()
  @IsEnum(ExpenseTypeDto)
  type?: ExpenseTypeDto;

  @IsNumber()
  amount!: number;

  @IsDateString()
  expenseDate!: string;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsString()
  paidTo?: string;
}