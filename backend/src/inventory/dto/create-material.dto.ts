import { IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateMaterialDto {
  @IsNumber()
  companyId!: number;

  @IsString()
  code!: string;

  @IsString()
  name!: string;

  @IsString()
  unit!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  minStock?: number;
}