import { IsEnum, IsNumber } from 'class-validator';
import { ProjectUserStatus } from '@prisma/client';

export class AssignProjectUserDto {
  @IsNumber()
  userId!: number;

  @IsNumber()
  roleId!: number;

  @IsEnum(ProjectUserStatus)
  status: ProjectUserStatus = ProjectUserStatus.ACTIVE;
}