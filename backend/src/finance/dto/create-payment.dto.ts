import { IsDateString, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

export enum PaymentStatusDto {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export enum PaymentTypeDto {
  ADVANCE = 'ADVANCE',
  PROGRESS = 'PROGRESS',
  RETENTION = 'RETENTION',
  FINAL = 'FINAL',
  OTHER = 'OTHER',
}

export class CreatePaymentDto {
  @IsNumber()
  projectId!: number;

  @IsOptional()
  @IsNumber()
  invoiceId?: number;

  @IsString()
  code!: string;

  @IsOptional()
  @IsEnum(PaymentTypeDto)
  type?: PaymentTypeDto;

  @IsOptional()
  @IsEnum(PaymentStatusDto)
  status?: PaymentStatusDto;

  @IsNumber()
  amount!: number;

  @IsOptional()
  @IsDateString()
  paymentDate?: string;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsString()
  paidBy?: string;

  @IsOptional()
  @IsString()
  paidTo?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}