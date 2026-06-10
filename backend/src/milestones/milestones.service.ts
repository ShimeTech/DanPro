import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMilestoneDto } from './dto/create-milestone.dto';
import { UpdateMilestoneDto } from './dto/update-milestone.dto';

@Injectable()
export class MilestonesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async create(dto: CreateMilestoneDto, userId?: number) {
    const project = await this.prisma.project.findUnique({
      where: { id: dto.projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const code = await this.generateMilestoneCode(dto.projectId);

    const milestone = await this.prisma.milestone.create({
      data: {
        projectId: dto.projectId,
        code,
        name: dto.name,
        description: dto.description ?? null,
        plannedDate: new Date(dto.plannedDate),
        actualDate: dto.actualDate ? new Date(dto.actualDate) : null,
        status: dto.status ?? 'PLANNED',
        isActive: true,
      },
      include: this.milestoneInclude(),
    });

    await this.auditService.create({
      userId,
      projectId: milestone.projectId,
      action: AuditAction.CREATE,
      module: 'milestones',
      entityName: 'Milestone',
      entityId: String(milestone.id),
      description: `Created milestone ${milestone.code} - ${milestone.name}`,
      newData: milestone,
    });

    return milestone;
  }

  findByProject(projectId: number) {
    return this.prisma.milestone.findMany({
      where: { projectId },
      include: this.milestoneInclude(),
      orderBy: [{ plannedDate: 'asc' }, { code: 'asc' }],
    });
  }

  async findOne(id: number) {
    const milestone = await this.prisma.milestone.findUnique({
      where: { id },
      include: this.milestoneInclude(),
    });

    if (!milestone) {
      throw new NotFoundException('Milestone not found');
    }

    return milestone;
  }

  async update(id: number, dto: UpdateMilestoneDto, userId?: number) {
    const oldMilestone = await this.findOne(id);

    if (dto.projectId) {
      const project = await this.prisma.project.findUnique({
        where: { id: dto.projectId },
      });

      if (!project) {
        throw new NotFoundException('Project not found');
      }
    }

    const updatedMilestone = await this.prisma.milestone.update({
      where: { id },
      data: {
        projectId: dto.projectId,
        name: dto.name,
        description: dto.description,
        plannedDate: dto.plannedDate ? new Date(dto.plannedDate) : undefined,
        actualDate:
          dto.actualDate === ''
            ? null
            : dto.actualDate
              ? new Date(dto.actualDate)
              : undefined,
        status: dto.status,
      },
      include: this.milestoneInclude(),
    });

    await this.auditService.create({
      userId,
      projectId: updatedMilestone.projectId,
      action: AuditAction.UPDATE,
      module: 'milestones',
      entityName: 'Milestone',
      entityId: String(id),
      description: `Updated milestone ${updatedMilestone.code} - ${updatedMilestone.name}`,
      oldData: oldMilestone,
      newData: updatedMilestone,
    });

    return updatedMilestone;
  }

  async remove(id: number, userId?: number) {
    const oldMilestone = await this.findOne(id);

    const deactivatedMilestone = await this.prisma.milestone.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        isActive: false,
      },
      include: this.milestoneInclude(),
    });

    await this.auditService.create({
      userId,
      projectId: oldMilestone.projectId,
      action: AuditAction.DELETE,
      module: 'milestones',
      entityName: 'Milestone',
      entityId: String(id),
      description: `Deactivated milestone ${oldMilestone.code} - ${oldMilestone.name}`,
      oldData: oldMilestone,
      newData: deactivatedMilestone,
    });

    return deactivatedMilestone;
  }

  async activate(id: number, userId?: number) {
    const oldMilestone = await this.findOne(id);

    const activatedMilestone = await this.prisma.milestone.update({
      where: { id },
      data: {
        status: 'PLANNED',
        isActive: true,
      },
      include: this.milestoneInclude(),
    });

    await this.auditService.create({
      userId,
      projectId: oldMilestone.projectId,
      action: AuditAction.UPDATE,
      module: 'milestones',
      entityName: 'Milestone',
      entityId: String(id),
      description: `Activated milestone ${oldMilestone.code} - ${oldMilestone.name}`,
      oldData: oldMilestone,
      newData: activatedMilestone,
    });

    return activatedMilestone;
  }

  private async generateMilestoneCode(projectId: number) {
    const count = await this.prisma.milestone.count({
      where: { projectId },
    });

    return `MS-${String(count + 1).padStart(3, '0')}`;
  }

  private milestoneInclude() {
    return {
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