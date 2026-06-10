import { AuditAction } from '@prisma/client';

export class CreateAuditLogDto {
  userId?: number;
  projectId?: number;
  action!: AuditAction;
  module!: string;
  entityName!: string;
  entityId?: string;
  description?: string;
  oldData?: any;
  newData?: any;
  ipAddress?: string;
  userAgent?: string;
}