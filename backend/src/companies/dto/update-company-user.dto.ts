import { IsEnum, IsNumber, IsOptional } from 'class-validator';
import { CompanyUserStatus } from '@prisma/client';

export class UpdateCompanyUserDto {
  @IsOptional()
  @IsNumber()
  roleId?: number;

  @IsOptional()
  @IsEnum(CompanyUserStatus)
  status?: CompanyUserStatus;
}