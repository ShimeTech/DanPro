import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

export enum InventoryTransactionTypeDto {
  RECEIVE = 'RECEIVE',
  ISSUE = 'ISSUE',
  RETURN = 'RETURN',
  ADJUSTMENT = 'ADJUSTMENT',
}

export class CreateInventoryTransactionDto {
  @IsNumber()
  projectId!: number;

  @IsNumber()
  materialId!: number;

  @IsEnum(InventoryTransactionTypeDto)
  type!: InventoryTransactionTypeDto;

  @IsNumber()
  quantity!: number;

  @IsString()
  unit!: string;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}