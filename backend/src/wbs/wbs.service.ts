import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWbsItemDto } from './dto/create-wbs-item.dto';
import { UpdateWbsItemDto } from './dto/update-wbs-item.dto';

@Injectable()
export class WbsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async create(dto: CreateWbsItemDto, userId?: number) {
    const project = await this.prisma.project.findUnique({
      where: { id: dto.projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (dto.parentId) {
      const parent = await this.prisma.wbsItem.findUnique({
        where: { id: dto.parentId },
      });

      if (!parent || parent.projectId !== dto.projectId) {
        throw new BadRequestException('Invalid parent WBS item');
      }
    }

    const code = await this.generateWbsCode(dto.projectId, dto.parentId ?? null);

    const wbsItem = await this.prisma.wbsItem.create({
      data: {
        projectId: dto.projectId,
        parentId: dto.parentId ?? null,
        code,
        name: dto.name,
        description: dto.description ?? null,
        sortOrder: dto.sortOrder ?? 0,
        isActive: true,
      },
      include: this.wbsInclude(),
    });

    await this.auditService.create({
      userId,
      projectId: dto.projectId,
      action: AuditAction.CREATE,
      module: 'wbs',
      entityName: 'WbsItem',
      entityId: String(wbsItem.id),
      description: `Created WBS item ${wbsItem.code} - ${wbsItem.name}`,
      newData: wbsItem,
    });

    return wbsItem;
  }

  findByProject(projectId: number) {
    return this.prisma.wbsItem.findMany({
      where: {
        projectId,
        isActive: true,
      },
      include: this.wbsInclude(),
      orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
    });
  }

  async findOne(id: number) {
    const wbsItem = await this.prisma.wbsItem.findUnique({
      where: { id },
      include: this.wbsInclude(),
    });

    if (!wbsItem) {
      throw new NotFoundException('WBS item not found');
    }

    return wbsItem;
  }

  async update(id: number, dto: UpdateWbsItemDto, userId?: number) {
    const oldWbsItem = await this.findOne(id);
    const projectId = dto.projectId ?? oldWbsItem.projectId;

    if (dto.projectId) {
      const project = await this.prisma.project.findUnique({
        where: { id: dto.projectId },
      });

      if (!project) {
        throw new NotFoundException('Project not found');
      }
    }

    if (dto.parentId) {
      if (dto.parentId === id) {
        throw new BadRequestException('WBS item cannot be its own parent');
      }

      const parent = await this.prisma.wbsItem.findUnique({
        where: { id: dto.parentId },
      });

      if (!parent || parent.projectId !== projectId) {
        throw new BadRequestException('Invalid parent WBS item');
      }
    }

    const updatedWbsItem = await this.prisma.wbsItem.update({
      where: { id },
      data: {
        projectId: dto.projectId,
        parentId: dto.parentId,
        name: dto.name,
        description: dto.description,
        sortOrder: dto.sortOrder,
      },
      include: this.wbsInclude(),
    });

    await this.auditService.create({
      userId,
      projectId: updatedWbsItem.projectId,
      action: AuditAction.UPDATE,
      module: 'wbs',
      entityName: 'WbsItem',
      entityId: String(id),
      description: `Updated WBS item ${updatedWbsItem.code} - ${updatedWbsItem.name}`,
      oldData: oldWbsItem,
      newData: updatedWbsItem,
    });

    return updatedWbsItem;
  }

  async remove(id: number, userId?: number) {
    const oldWbsItem = await this.findOne(id);

    const deactivated = await this.prisma.wbsItem.update({
      where: { id },
      data: {
        isActive: false,
      },
      include: this.wbsInclude(),
    });

    await this.auditService.create({
      userId,
      projectId: oldWbsItem.projectId,
      action: AuditAction.DELETE,
      module: 'wbs',
      entityName: 'WbsItem',
      entityId: String(id),
      description: `Deactivated WBS item ${oldWbsItem.code} - ${oldWbsItem.name}`,
      oldData: oldWbsItem,
      newData: deactivated,
    });

    return deactivated;
  }

  private async generateWbsCode(projectId: number, parentId: number | null) {
    if (!parentId) {
      const rootCount = await this.prisma.wbsItem.count({
        where: {
          projectId,
          parentId: null,
        },
      });

      return `${rootCount + 1}.0`;
    }

    const parent = await this.prisma.wbsItem.findUnique({
      where: { id: parentId },
    });

    if (!parent) {
      throw new BadRequestException('Invalid parent WBS item');
    }

    const childCount = await this.prisma.wbsItem.count({
      where: {
        projectId,
        parentId,
      },
    });

    const parentPrefix = parent.code.split('.')[0];

    return `${parentPrefix}.${childCount + 1}`;
  }

  private wbsInclude() {
    return {
      project: true,
      parent: true,
      children: true,
      tasks: true,
    };
  }
}