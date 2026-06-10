import { IsArray, IsDateString, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

export enum ProcurementStatusDto {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  ORDERED = 'ORDERED',
  RECEIVED = 'RECEIVED',
  CANCELLED = 'CANCELLED',
}

export class PurchaseRequestItemDto {
  @IsOptional()
  @IsNumber()
  materialId?: number;

  @IsString()
  description!: string;

  @IsNumber()
  quantity!: number;

  @IsString()
  unit!: string;
}

export class CreatePurchaseRequestDto {
  @IsNumber()
  projectId!: number;

  @IsString()
  code!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(ProcurementStatusDto)
  status?: ProcurementStatusDto;

  @IsOptional()
  @IsDateString()
  requestedDate?: string;

  @IsOptional()
  @IsArray()
  items?: PurchaseRequestItemDto[];
}