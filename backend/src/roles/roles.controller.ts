import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AssignPermissionDto } from './dto/assign-permission.dto';
import { CreateRoleDto } from './dto/create-role.dto';
import { RolesService } from './roles.service';

@Controller('roles')
@UseGuards(JwtAuthGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  findAllRoles() {
    return this.rolesService.findAllRoles();
  }

  @Get('permissions')
  findAllPermissions() {
    return this.rolesService.findAllPermissions();
  }

  @Get(':id')
  findOneRole(@Param('id', ParseIntPipe) id: number) {
    return this.rolesService.findOneRole(id);
  }

  @Post()
  createRole(@Body() dto: CreateRoleDto) {
    return this.rolesService.createRole(dto);
  }

  @Post(':id/permissions')
  assignPermission(
    @Param('id', ParseIntPipe) roleId: number,
    @Body() dto: AssignPermissionDto,
  ) {
    return this.rolesService.assignPermission(roleId, dto);
  }
@Put(':id/permissions')
syncPermissions(
  @Param('id', ParseIntPipe) id: number,
  @Body('permissionIds') permissionIds: number[],
) {
  return this.rolesService.syncPermissions(id, permissionIds);
}
  @Delete(':id/permissions/:permissionId')
  removePermission(
    @Param('id', ParseIntPipe) roleId: number,
    @Param('permissionId', ParseIntPipe) permissionId: number,
  ) {
    return this.rolesService.removePermission(roleId, permissionId);
  }
}