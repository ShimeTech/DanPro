import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

export enum VariationStatusDto {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export class CreateVariationDto {
  @IsNumber()
  projectId!: number;

  @IsString()
  code!: string;

  @IsString()
  title!: string;

  @IsString()
  description!: string;

  @IsNumber()
  amount!: number;

  @IsOptional()
  @IsEnum(VariationStatusDto)
  status?: VariationStatusDto;
}