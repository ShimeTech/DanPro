import { IsEnum, IsNumber, IsOptional } from 'class-validator';
import { ProjectUserStatus } from '@prisma/client';

export class UpdateProjectUserDto {
  @IsOptional()
  @IsNumber()
  roleId?: number;

  @IsOptional()
  @IsEnum(ProjectUserStatus)
  status?: ProjectUserStatus;
}