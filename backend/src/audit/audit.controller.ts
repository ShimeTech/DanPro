import {
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { AuditService } from './audit.service';

@Controller('audit-logs')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @Permissions('audit_logs:read')
  findAll(
    @Query('projectId') projectId?: string,
    @Query('userId') userId?: string,
    @Query('module') module?: string,
    @Query('action') action?: string,
    @Query('take') take?: string,
  ) {
    return this.auditService.findAll({
      projectId: projectId ? Number(projectId) : undefined,
      userId: userId ? Number(userId) : undefined,
      module,
      action,
      take: take ? Number(take) : 200,
    });
  }

  @Get('project/:projectId')
  @Permissions('audit_logs:read')
  findByProject(@Param('projectId', ParseIntPipe) projectId: number) {
    return this.auditService.findByProject(projectId);
  }

  @Get('user/:userId')
  @Permissions('audit_logs:read')
  findByUser(@Param('userId', ParseIntPipe) userId: number) {
    return this.auditService.findByUser(userId);
  }

  @Delete()
  @Permissions('audit_logs:delete')
  clearOld(@Query('before') before: string) {
    return this.auditService.clearOld(before);
  }

  @Get(':id')
  @Permissions('audit_logs:read')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.auditService.findOne(id);
  }

  @Delete(':id')
  @Permissions('audit_logs:delete')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.auditService.remove(id);
  }
}