import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBaselineDto } from './dto/create-baseline.dto';
import { UpdateBaselineDto } from './dto/update-baseline.dto';

@Injectable()
export class SchedulesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  private async generateBaselineVersion(projectId: number) {
    const latestBaseline = await this.prisma.scheduleBaseline.findFirst({
      where: { projectId },
      orderBy: { id: 'desc' },
    });

    const latestNumber = Number(
      String(latestBaseline?.version || 'BL-000').replace('BL-', ''),
    );

    return `BL-${String(latestNumber + 1).padStart(3, '0')}`;
  }

  async createBaseline(dto: CreateBaselineDto, userId?: number) {
    const project = await this.prisma.project.findUnique({
      where: { id: dto.projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const tasks = await this.prisma.task.findMany({
      where: {
        projectId: dto.projectId,
        isActive: true,
      },
    });

    if (tasks.length === 0) {
      throw new BadRequestException('Cannot create baseline without active tasks');
    }

    const version = await this.generateBaselineVersion(dto.projectId);

    const baseline = await this.prisma.scheduleBaseline.create({
      data: {
        projectId: dto.projectId,
        name: dto.name,
        version,
        description: dto.description ?? null,
        status: 'DRAFT',
        isActive: true,
        items: {
          create: tasks.map((task) => ({
            taskId: task.id,
            plannedStart: task.plannedStart,
            plannedEnd: task.plannedEnd,
            durationDays: task.durationDays,
          })),
        },
      },
      include: this.baselineInclude(),
    });

    await this.auditService.create({
      userId,
      projectId: baseline.projectId,
      action: AuditAction.CREATE,
      module: 'schedules',
      entityName: 'ScheduleBaseline',
      entityId: String(baseline.id),
      description: `Created schedule baseline ${baseline.version}`,
      newData: baseline,
    });

    return baseline;
  }

  findByProject(projectId: number) {
    return this.prisma.scheduleBaseline.findMany({
      where: { projectId },
      include: this.baselineInclude(),
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number) {
    const baseline = await this.prisma.scheduleBaseline.findUnique({
      where: { id },
      include: this.baselineInclude(),
    });

    if (!baseline) {
      throw new NotFoundException('Schedule baseline not found');
    }

    return baseline;
  }

  async updateBaseline(id: number, dto: UpdateBaselineDto, userId?: number) {
    const oldBaseline = await this.findOne(id);
    const status = String(oldBaseline.status);

    if (status === 'APPROVED') {
      throw new BadRequestException('Approved baseline cannot be edited');
    }

    if (status === 'PENDING_APPROVAL') {
      throw new BadRequestException('Baseline submitted for approval cannot be edited');
    }

    if (!oldBaseline.isActive) {
      throw new BadRequestException('Inactive baseline cannot be edited');
    }

    const updated = await this.prisma.scheduleBaseline.update({
      where: { id },
      data: {
        projectId: dto.projectId,
        name: dto.name,
        description: dto.description,
      },
      include: this.baselineInclude(),
    });

    await this.auditService.create({
      userId,
      projectId: updated.projectId,
      action: AuditAction.UPDATE,
      module: 'schedules',
      entityName: 'ScheduleBaseline',
      entityId: String(id),
      description: `Updated schedule baseline ${updated.version}`,
      oldData: oldBaseline,
      newData: updated,
    });

    return updated;
  }

  async submitBaselineForApproval(id: number, userId?: number) {
    const oldBaseline = await this.findOne(id);
    const status = String(oldBaseline.status);

    if (!oldBaseline.isActive) {
      throw new BadRequestException('Inactive baseline cannot be submitted for approval');
    }

    if (status === 'APPROVED') {
      throw new BadRequestException('Approved baseline is already controlled');
    }

    if (status === 'PENDING_APPROVAL') {
      throw new BadRequestException('Baseline is already submitted for approval');
    }

    if (!oldBaseline.items || oldBaseline.items.length === 0) {
      throw new BadRequestException('Cannot submit baseline without baseline items');
    }

    const submitted = await this.prisma.scheduleBaseline.update({
      where: { id },
      data: {
        status: 'PENDING_APPROVAL',
        submittedAt: new Date(),
        submittedBy: userId,
        rejectedAt: null,
        rejectedBy: null,
        rejectionReason: null,
      } as any,
      include: this.baselineInclude(),
    });

    await this.auditService.create({
      userId,
      projectId: submitted.projectId,
      action: AuditAction.UPDATE,
      module: 'schedules',
      entityName: 'ScheduleBaseline',
      entityId: String(id),
      description: `Submitted schedule baseline ${submitted.version} for approval`,
      oldData: oldBaseline,
      newData: submitted,
    });

    return submitted;
  }

  async approveBaseline(id: number, userId?: number) {
    const oldBaseline = await this.findOne(id);
    const status = String(oldBaseline.status);

    if (!oldBaseline.isActive) {
      throw new BadRequestException('Inactive baseline cannot be approved');
    }

    if (status === 'APPROVED') {
      throw new BadRequestException('Baseline is already approved');
    }

    if (status !== 'PENDING_APPROVAL') {
      throw new BadRequestException('Only submitted baselines can be approved');
    }

    await this.prisma.scheduleBaseline.updateMany({
      where: {
        projectId: oldBaseline.projectId,
        status: 'APPROVED',
        NOT: { id },
      },
      data: {
        status: 'SUPERSEDED',
        isActive: false,
      },
    });

    const approved = await this.prisma.scheduleBaseline.update({
      where: { id },
      data: {
        status: 'APPROVED',
        isActive: true,
        approvedAt: new Date(),
        approvedBy: userId,
      },
      include: this.baselineInclude(),
    });

    await this.auditService.create({
      userId,
      projectId: approved.projectId,
      action: AuditAction.APPROVE,
      module: 'schedules',
      entityName: 'ScheduleBaseline',
      entityId: String(id),
      description: `Approved schedule baseline ${approved.version}`,
      oldData: oldBaseline,
      newData: approved,
    });

    return approved;
  }

  async rejectBaseline(id: number, reason: string, userId?: number) {
    const oldBaseline = await this.findOne(id);
    const status = String(oldBaseline.status);

    if (!reason || !reason.trim()) {
      throw new BadRequestException('Rejection reason is required');
    }

    if (status !== 'PENDING_APPROVAL') {
      throw new BadRequestException('Only submitted baselines can be rejected');
    }

    const rejected = await this.prisma.scheduleBaseline.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectedAt: new Date(),
        rejectedBy: userId,
        rejectionReason: reason.trim(),
      } as any,
      include: this.baselineInclude(),
    });

    await this.auditService.create({
      userId,
      projectId: rejected.projectId,
      action: AuditAction.UPDATE,
      module: 'schedules',
      entityName: 'ScheduleBaseline',
      entityId: String(id),
      description: `Rejected schedule baseline ${rejected.version}`,
      oldData: oldBaseline,
      newData: rejected,
    });

    return rejected;
  }

  async removeBaseline(id: number, userId?: number) {
    const oldBaseline = await this.findOne(id);
    const status = String(oldBaseline.status);

    if (status === 'APPROVED') {
      throw new BadRequestException('Approved baseline cannot be deactivated');
    }

    const deactivated = await this.prisma.scheduleBaseline.update({
      where: { id },
      data: {
        isActive: false,
        status: 'SUPERSEDED',
      },
      include: this.baselineInclude(),
    });

    await this.auditService.create({
      userId,
      projectId: oldBaseline.projectId,
      action: AuditAction.DELETE,
      module: 'schedules',
      entityName: 'ScheduleBaseline',
      entityId: String(id),
      description: `Deactivated schedule baseline ${oldBaseline.version}`,
      oldData: oldBaseline,
      newData: deactivated,
    });

    return deactivated;
  }

  async deleteBaseline(id: number, userId?: number) {
    const oldBaseline = await this.findOne(id);
    const status = String(oldBaseline.status);

    if (status === 'APPROVED') {
      throw new BadRequestException('Approved baseline cannot be permanently deleted');
    }

    if (status === 'PENDING_APPROVAL') {
      throw new BadRequestException('Submitted baseline cannot be permanently deleted');
    }

    await this.prisma.scheduleBaselineItem.deleteMany({
      where: { baselineId: id },
    });

    const deleted = await this.prisma.scheduleBaseline.delete({
      where: { id },
    });

    await this.auditService.create({
      userId,
      projectId: oldBaseline.projectId,
      action: AuditAction.DELETE,
      module: 'schedules',
      entityName: 'ScheduleBaseline',
      entityId: String(id),
      description: `Permanently deleted schedule baseline ${oldBaseline.version}`,
      oldData: oldBaseline,
      newData: deleted,
    });

    return deleted;
  }

  async activateBaseline(id: number, userId?: number) {
    const oldBaseline = await this.findOne(id);
    const status = String(oldBaseline.status);

    if (status === 'APPROVED') {
      throw new BadRequestException(
        'Approved baseline is already controlled and cannot be reset to draft',
      );
    }

    const activated = await this.prisma.scheduleBaseline.update({
      where: { id },
      data: {
        isActive: true,
        status: 'DRAFT',
      },
      include: this.baselineInclude(),
    });

    await this.auditService.create({
      userId,
      projectId: oldBaseline.projectId,
      action: AuditAction.UPDATE,
      module: 'schedules',
      entityName: 'ScheduleBaseline',
      entityId: String(id),
      description: `Activated schedule baseline ${oldBaseline.version}`,
      oldData: oldBaseline,
      newData: activated,
    });

    return activated;
  }

  async unlockBaseline(id: number, userId?: number) {
    const baseline = await this.findOne(id);
    const status = String(baseline.status);

    if (status !== 'APPROVED') {
      throw new BadRequestException('Only approved baselines can be unlocked');
    }

    const newVersion = await this.generateBaselineVersion(baseline.projectId);

    const unlocked = await this.prisma.scheduleBaseline.create({
      data: {
        projectId: baseline.projectId,
        name: `${baseline.name} Revision`,
        version: newVersion,
        description: baseline.description,
        status: 'DRAFT',
        isActive: true,
        items: {
          create:
            baseline.items?.map((item) => ({
              taskId: item.taskId,
              plannedStart: item.plannedStart,
              plannedEnd: item.plannedEnd,
              durationDays: item.durationDays,
            })) || [],
        },
      },
      include: this.baselineInclude(),
    });

    await this.auditService.create({
      userId,
      projectId: baseline.projectId,
      action: AuditAction.CREATE,
      module: 'schedules',
      entityName: 'ScheduleBaseline',
      entityId: String(unlocked.id),
      description: `Created revision baseline ${newVersion} from ${baseline.version}`,
      oldData: baseline,
      newData: unlocked,
    });

    return unlocked;
  }

  private baselineInclude() {
    return {
      project: true,
      items: {
        include: {
          task: {
            select: {
              id: true,
              code: true,
              name: true,
              status: true,
              plannedStart: true,
              plannedEnd: true,
              actualStart: true,
              actualEnd: true,
              progress: true,
            },
          },
        },
      },
    };
  }
} 