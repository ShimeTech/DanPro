import { IsArray, IsDateString, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { ProcurementStatusDto } from './create-purchase-request.dto';

export class PurchaseOrderItemDto {
  @IsOptional()
  @IsNumber()
  materialId?: number;

  @IsString()
  description!: string;

  @IsNumber()
  quantity!: number;

  @IsString()
  unit!: string;

  @IsOptional()
  @IsNumber()
  unitPrice?: number;

  @IsOptional()
  @IsNumber()
  totalPrice?: number;
}

export class CreatePurchaseOrderDto {
  @IsNumber()
  projectId!: number;

  @IsOptional()
  @IsNumber()
  supplierId?: number;

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
  orderDate?: string;

  @IsOptional()
  @IsNumber()
  totalAmount?: number;

  @IsOptional()
  @IsArray()
  items?: PurchaseOrderItemDto[];
}