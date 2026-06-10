import { IsDateString, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

export enum InvoiceStatusDto {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED',
}

export class CreateInvoiceDto {
  @IsNumber()
  projectId!: number;

  @IsString()
  code!: string;

  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsDateString()
  invoiceDate!: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsNumber()
  subtotal!: number;

  @IsOptional()
  @IsNumber()
  taxAmount?: number;

  @IsOptional()
  @IsNumber()
  retentionAmount?: number;

  @IsOptional()
  @IsNumber()
  advanceDeduction?: number;

  @IsOptional()
  @IsEnum(InvoiceStatusDto)
  status?: InvoiceStatusDto;
}