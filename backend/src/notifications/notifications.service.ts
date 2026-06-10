import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';

const notificationTypes = ['INFO', 'SUCCESS', 'WARNING', 'ERROR', 'APPROVAL', 'DEADLINE'];

@Injectable()
export class NotificationsService {
  private readonly db: any;

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {
    this.db = prisma as any;
  }

  async create(dto: CreateNotificationDto, actorUserId?: number) {
    await this.ensureUser(Number(dto.userId));

    if (dto.projectId) {
      await this.ensureProject(Number(dto.projectId));
    }

    const isRead = Boolean(dto.isRead);

    const notification = await this.db.notification.create({
      data: {
        userId: Number(dto.userId),
        projectId: dto.projectId ? Number(dto.projectId) : null,
        type: this.normalizeType(dto.type ?? 'INFO'),
        title: this.requiredText(dto.title, 'Title'),
        message: this.requiredText(dto.message, 'Message'),
        isRead,
        readAt: isRead ? new Date() : null,
      },
      include: this.include(),
    });

    await this.audit(
      'CREATE',
      actorUserId,
      notification.projectId,
      'Notification',
      notification.id,
      `Created notification ${notification.title}`,
      undefined,
      notification,
    );

    return notification;
  }

  findAll() {
    return this.db.notification.findMany({
      include: this.include(),
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByUser(userId: number) {
    await this.ensureUser(userId);

    return this.db.notification.findMany({
      where: { userId },
      include: this.include(),
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByProject(projectId: number) {
    await this.ensureProject(projectId);

    return this.db.notification.findMany({
      where: { projectId },
      include: this.include(),
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number) {
    const notification = await this.db.notification.findUnique({
      where: { id },
      include: this.include(),
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return notification;
  }

  async update(id: number, dto: UpdateNotificationDto, actorUserId?: number) {
    const oldNotification = await this.findOne(id);

    if (dto.userId) {
      await this.ensureUser(Number(dto.userId));
    }

    if (dto.projectId) {
      await this.ensureProject(Number(dto.projectId));
    }

    const readChanged = dto.isRead !== undefined;

    const updated = await this.db.notification.update({
      where: { id },
      data: {
        userId: dto.userId !== undefined ? Number(dto.userId) : undefined,
        projectId: dto.projectId !== undefined ? dto.projectId ? Number(dto.projectId) : null : undefined,
        type: dto.type !== undefined ? this.normalizeType(dto.type) : undefined,
        title: dto.title !== undefined ? this.requiredText(dto.title, 'Title') : undefined,
        message: dto.message !== undefined ? this.requiredText(dto.message, 'Message') : undefined,
        isRead: dto.isRead !== undefined ? Boolean(dto.isRead) : undefined,
        readAt: readChanged ? dto.isRead ? new Date() : null : undefined,
      },
      include: this.include(),
    });

    await this.audit(
      'UPDATE',
      actorUserId,
      updated.projectId,
      'Notification',
      id,
      `Updated notification ${updated.title}`,
      oldNotification,
      updated,
    );

    return updated;
  }

  async markAsRead(id: number) {
    await this.findOne(id);

    return this.db.notification.update({
      where: { id },
      data: {
        isRead: true,
        readAt: new Date(),
      },
      include: this.include(),
    });
  }

  async markAsUnread(id: number) {
    await this.findOne(id);

    return this.db.notification.update({
      where: { id },
      data: {
        isRead: false,
        readAt: null,
      },
      include: this.include(),
    });
  }

  async markAllAsRead(userId: number) {
    await this.ensureUser(userId);

    const result = await this.db.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return { count: result.count };
  }

  async remove(id: number, actorUserId?: number) {
    const oldNotification = await this.findOne(id);

    const deleted = await this.db.notification.delete({
      where: { id },
    });

    await this.audit(
      'DELETE',
      actorUserId,
      oldNotification.projectId,
      'Notification',
      id,
      `Deleted notification ${oldNotification.title}`,
      oldNotification,
      deleted,
    );

    return deleted;
  }

  private async ensureUser(userId: number) {
    if (!userId) {
      throw new BadRequestException('User is required');
    }

    const user = await this.db.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }
  }

  private async ensureProject(projectId: number) {
    const project = await this.db.project.findUnique({
      where: { id: projectId },
      select: { id: true },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }
  }

  private normalizeType(type: string) {
    const value = String(type || '').trim().toUpperCase();

    if (!notificationTypes.includes(value)) {
      throw new BadRequestException('Invalid notification type');
    }

    return value;
  }

  private requiredText(value: unknown, label: string) {
    const text = String(value ?? '').trim();

    if (!text) {
      throw new BadRequestException(`${label} is required`);
    }

    return text;
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

  private async audit(
    action: keyof typeof AuditAction | string,
    userId: number | undefined,
    projectId: number | null | undefined,
    entityName: string,
    entityId: number,
    description: string,
    oldData?: any,
    newData?: any,
  ) {
    await this.auditService.create({
      userId,
      projectId: projectId ?? undefined,
      action: (AuditAction as any)[action] ?? AuditAction.UPDATE,
      module: 'notifications',
      entityName,
      entityId: String(entityId),
      description,
      oldData,
      newData,
    });
  }
}
