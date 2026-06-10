import { IsEnum, IsNumber } from 'class-validator';
import { CompanyUserStatus } from '@prisma/client';

export class AssignCompanyUserDto {
  @IsNumber()
  userId!: number;

  @IsNumber()
  roleId!: number;

  @IsEnum(CompanyUserStatus)
  status: CompanyUserStatus = CompanyUserStatus.ACTIVE;
}