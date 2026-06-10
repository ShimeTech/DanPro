import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';

type AuditFilter = {
  projectId?: number;
  userId?: number;
  module?: string;
  action?: string;
  take?: number;
};

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateAuditLogDto) {
    return this.prisma.auditLog.create({
      data: {
        userId: dto.userId,
        projectId: dto.projectId,
        action: dto.action,
        module: dto.module,
        entityName: dto.entityName,
        entityId: dto.entityId,
        description: dto.description,
        oldData: dto.oldData,
        newData: dto.newData,
        ipAddress: dto.ipAddress,
        userAgent: dto.userAgent,
      },
    });
  }

  findAll(filter: AuditFilter = {}) {
    return this.prisma.auditLog.findMany({
      where: {
        projectId: filter.projectId,
        userId: filter.userId,
        module: filter.module,
        action: filter.action as any,
      },
      include: this.include(),
      orderBy: {
        createdAt: 'desc',
      },
      take: filter.take && filter.take > 0 ? Math.min(filter.take, 1000) : 200,
    });
  }

  async findOne(id: number) {
    const log = await this.prisma.auditLog.findUnique({
      where: { id },
      include: this.include(),
    });

    if (!log) {
      throw new NotFoundException('Audit log not found');
    }

    return log;
  }

  findByProject(projectId: number) {
    return this.findAll({
      projectId,
      take: 500,
    });
  }

  findByUser(userId: number) {
    return this.findAll({
      userId,
      take: 500,
    });
  }

  async remove(id: number) {
    await this.findOne(id);

    return this.prisma.auditLog.delete({
      where: { id },
    });
  }

  async clearOld(before: string) {
    if (!before) {
      throw new BadRequestException('Before date is required');
    }

    const date = new Date(before);

    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Invalid before date');
    }

    return this.prisma.auditLog.deleteMany({
      where: {
        createdAt: {
          lt: date,
        },
      },
    });
  }

  private include() {
    return {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      project: {
        select: {
          id: true,
          code: true,
          name: true,
        },
      },
    };
  }
}