import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

export enum ApprovalStatusDto {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  RETURNED = 'RETURNED',
}

export class CreateApprovalDto {
  @IsNumber()
  projectId!: number;

  @IsOptional()
  @IsNumber()
  userId?: number;

  @IsOptional()
  @IsEnum(ApprovalStatusDto)
  status?: ApprovalStatusDto;

  @IsString()
  module!: string;

  @IsString()
  entityName!: string;

  @IsNumber()
  entityId!: number;

  @IsOptional()
  @IsNumber()
  rfiId?: number;

  @IsOptional()
  @IsNumber()
  submittalId?: number;

  @IsOptional()
  @IsString()
  comments?: string;
}