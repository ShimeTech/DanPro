import { IsNumber } from 'class-validator';

export class AssignPermissionDto {
  @IsNumber()
  permissionId!: number;
}