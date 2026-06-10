import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { AssignProjectUserDto } from './dto/assign-project-user.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectUserDto } from './dto/update-project-user.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async create(dto: CreateProjectDto, userId?: number) {
    const company = await this.prisma.company.findUnique({
      where: { id: dto.companyId },
    });

    if (!company) {
      throw new NotFoundException('Company not found'); 
    }

    const existingProject = await this.prisma.project.findFirst({
      where: {
        companyId: dto.companyId,
        code: dto.code,
      },
    });

    if (existingProject) {
      throw new BadRequestException(
        'Project code already exists for this company',
      );
    }

    const project = await this.prisma.project.create({
      data: {
        companyId: dto.companyId,
        code: dto.code,
        name: dto.name,
        description: dto.description,
        clientName: dto.clientName,
        location: dto.location,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        budget: dto.budget,
        currency: dto.currency || company.currency || 'USD',
        status: dto.status || 'PLANNING',
      },
      include: {
        company: true,
      },
    });

    await this.auditService.create({
      userId,
      projectId: project.id,
      action: AuditAction.CREATE,
      module: 'projects',
      entityName: 'Project',
      entityId: String(project.id),
      description: `Created project ${project.code} - ${project.name}`,
      newData: project,
    });

    return project;
  }

  findAll(companyId?: number) {
    return this.prisma.project.findMany({
      where: companyId ? { companyId } : undefined,
      include: {
        company: {
          select: {
            id: true,
            name: true,
            currency: true,
            timezone: true,
          },
        },
        projectUsers: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                jobTitle: true,
              },
            },
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: number) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        company: true,
        projectUsers: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                jobTitle: true,
                status: true,
              },
            },
            role: true,
          },
        },
        auditLogs: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 20,
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return project;
  }

  async update(id: number, dto: UpdateProjectDto, userId?: number) {
    const oldProject = await this.findOne(id);

    if (dto.companyId) {
      const company = await this.prisma.company.findUnique({
        where: { id: dto.companyId },
      });

      if (!company) {
        throw new NotFoundException('Company not found');
      }
    }

    const updatedProject = await this.prisma.project.update({
      where: { id },
      data: {
        companyId: dto.companyId,
        code: dto.code,
        name: dto.name,
        description: dto.description,
        clientName: dto.clientName,
        location: dto.location,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        budget: dto.budget,
        currency: dto.currency,
        status: dto.status,
      },
      include: {
        company: true,
      },
    });

    await this.auditService.create({
      userId,
      projectId: id,
      action: AuditAction.UPDATE,
      module: 'projects',
      entityName: 'Project',
      entityId: String(id),
      description: `Updated project ${updatedProject.code} - ${updatedProject.name}`,
      oldData: oldProject,
      newData: updatedProject,
    });

    return updatedProject;
  }

  async remove(id: number, userId?: number) {
    const oldProject = await this.findOne(id);

    const removedProject = await this.prisma.project.update({
      where: { id },
      data: {
        status: 'CANCELLED',
      },
    });

    await this.auditService.create({
      userId,
      projectId: id,
      action: AuditAction.DELETE,
      module: 'projects',
      entityName: 'Project',
      entityId: String(id),
      description: `Cancelled project ${removedProject.code} - ${removedProject.name}`,
      oldData: oldProject,
      newData: removedProject,
    });

    return removedProject;
  }

  async assignUser(
    projectId: number,
    dto: AssignProjectUserDto,
    userId?: number,
  ) {
    await this.findOne(projectId);

    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const role = await this.prisma.role.findUnique({
      where: { id: dto.roleId },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    const assignment = await this.prisma.projectUser.upsert({
      where: {
        projectId_userId: {
          projectId,
          userId: dto.userId,
        },
      },
      update: {
        roleId: dto.roleId,
        status: dto.status,
      },
      create: {
        projectId,
        userId: dto.userId,
        roleId: dto.roleId,
        status: dto.status,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            jobTitle: true,
            status: true,
          },
        },
        role: true,
        project: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    });

    await this.auditService.create({
      userId,
      projectId,
      action: AuditAction.UPDATE,
      module: 'projects',
      entityName: 'ProjectUser',
      entityId: `${projectId}:${dto.userId}`,
      description: `Assigned user ${dto.userId} to project ${projectId}`,
      newData: assignment,
    });

    return assignment;
  }

  listProjectUsers(projectId: number) {
    return this.prisma.projectUser.findMany({
      where: { projectId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            jobTitle: true,
            status: true,
          },
        },
        role: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async updateProjectUser(
    projectId: number,
    targetUserId: number,
    dto: UpdateProjectUserDto,
    userId?: number,
  ) {
    await this.findOne(projectId);

    const existing = await this.prisma.projectUser.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId: targetUserId,
        },
      },
    });

    if (!existing) {
      throw new NotFoundException('Project user assignment not found');
    }

    if (dto.roleId) {
      const role = await this.prisma.role.findUnique({
        where: { id: dto.roleId },
      });

      if (!role) {
        throw new NotFoundException('Role not found');
      }
    }

    const updated = await this.prisma.projectUser.update({
      where: {
        projectId_userId: {
          projectId,
          userId: targetUserId,
        },
      },
      data: {
        roleId: dto.roleId,
        status: dto.status,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            jobTitle: true,
            status: true,
          },
        },
        role: true,
      },
    });

    await this.auditService.create({
      userId,
      projectId,
      action: AuditAction.UPDATE,
      module: 'projects',
      entityName: 'ProjectUser',
      entityId: `${projectId}:${targetUserId}`,
      description: `Updated user ${targetUserId} assignment in project ${projectId}`,
      oldData: existing,
      newData: updated,
    });

    return updated;
  }

  async removeProjectUser(
    projectId: number,
    targetUserId: number,
    userId?: number,
  ) {
    await this.findOne(projectId);

    const existing = await this.prisma.projectUser.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId: targetUserId,
        },
      },
    });

    if (!existing) {
      throw new NotFoundException('Project user assignment not found');
    }

    const removed = await this.prisma.projectUser.delete({
      where: {
        projectId_userId: {
          projectId,
          userId: targetUserId,
        },
      },
    });

    await this.auditService.create({
      userId,
      projectId,
      action: AuditAction.DELETE,
      module: 'projects',
      entityName: 'ProjectUser',
      entityId: `${projectId}:${targetUserId}`,
      description: `Removed user ${targetUserId} from project ${projectId}`,
      oldData: existing,
      newData: removed,
    });

    return removed;
  }
}