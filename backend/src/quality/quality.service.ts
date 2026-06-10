import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction, Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateChecklistDto } from './dto/create-checklist.dto';
import { UpdateChecklistDto } from './dto/update-checklist.dto';
import { CreateInspectionDto } from './dto/create-inspection.dto';
import { UpdateInspectionDto } from './dto/update-inspection.dto';
import { CreateNcrDto } from './dto/create-ncr.dto';
import { UpdateNcrDto } from './dto/update-ncr.dto';

const inspectionStatuses = ['PLANNED', 'PASSED', 'FAILED', 'CANCELLED'];
const ncrStatuses = ['OPEN', 'UNDER_REVIEW', 'CLOSED'];

@Injectable()
export class QualityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async createChecklist(dto: CreateChecklistDto, userId?: number) {
    const projectId = Number(dto.projectId);
    await this.ensureProject(projectId);

    const code = this.requiredText(dto.code, 'Checklist code').toUpperCase();

    const duplicate = await this.prisma.qualityChecklist.findFirst({
      where: { projectId, code },
      select: { id: true },
    });

    if (duplicate) {
      throw new BadRequestException('Checklist code already exists for this project');
    }

    const checklist = await this.prisma.qualityChecklist.create({
      data: {
        projectId,
        code,
        title: this.requiredText(dto.title, 'Title'),
        description: this.nullIfEmpty(dto.description),
        items: dto.items ?? [],
      },
      include: this.checklistInclude(),
    });

    await this.auditService.create({
      userId,
      projectId: checklist.projectId,
      action: AuditAction.CREATE,
      module: 'quality',
      entityName: 'QualityChecklist',
      entityId: String(checklist.id),
      description: `Created quality checklist ${checklist.code}`,
      newData: checklist,
    });

    return checklist;
  }

  async findChecklists(projectId: number) {
    await this.ensureProject(projectId);

    return this.prisma.qualityChecklist.findMany({
      where: { projectId },
      include: this.checklistInclude(),
      orderBy: { createdAt: 'desc' },
    });
  }

  async findChecklist(id: number) {
    const checklist = await this.prisma.qualityChecklist.findUnique({
      where: { id },
      include: this.checklistInclude(),
    });

    if (!checklist) throw new NotFoundException('Quality checklist not found');
    return checklist;
  }

  async updateChecklist(id: number, dto: UpdateChecklistDto, userId?: number) {
    const oldChecklist = await this.findChecklist(id);
    const projectId = dto.projectId ? Number(dto.projectId) : oldChecklist.projectId;

    if (dto.projectId) await this.ensureProject(projectId);

    const nextCode = dto.code
      ? this.requiredText(dto.code, 'Checklist code').toUpperCase()
      : oldChecklist.code;

    if (dto.code || dto.projectId) {
      const duplicate = await this.prisma.qualityChecklist.findFirst({
        where: { projectId, code: nextCode, NOT: { id } },
        select: { id: true },
      });

      if (duplicate) {
        throw new BadRequestException('Checklist code already exists for this project');
      }
    }

    const updated = await this.prisma.qualityChecklist.update({
      where: { id },
      data: {
        projectId: dto.projectId ? projectId : undefined,
        code: dto.code !== undefined ? nextCode : undefined,
        title: dto.title !== undefined ? this.requiredText(dto.title, 'Title') : undefined,
        description: dto.description !== undefined ? this.nullIfEmpty(dto.description) : undefined,
        items: dto.items !== undefined ? dto.items : undefined,
      },
      include: this.checklistInclude(),
    });

    await this.auditService.create({
      userId,
      projectId: updated.projectId,
      action: AuditAction.UPDATE,
      module: 'quality',
      entityName: 'QualityChecklist',
      entityId: String(id),
      description: `Updated quality checklist ${updated.code}`,
      oldData: oldChecklist,
      newData: updated,
    });

    return updated;
  }

  async removeChecklist(id: number, userId?: number) {
    const oldChecklist = await this.findChecklist(id);

    const inspectionCount = await this.prisma.inspection.count({ where: { checklistId: id } });
    if (inspectionCount > 0) {
      throw new BadRequestException('Checklist with inspections cannot be deleted');
    }

    const deleted = await this.prisma.qualityChecklist.delete({ where: { id } });

    await this.auditService.create({
      userId,
      projectId: oldChecklist.projectId,
      action: AuditAction.DELETE,
      module: 'quality',
      entityName: 'QualityChecklist',
      entityId: String(id),
      description: `Deleted quality checklist ${oldChecklist.code}`,
      oldData: oldChecklist,
      newData: deleted,
    });

    return deleted;
  }

  async createInspection(dto: CreateInspectionDto, userId?: number) {
    const projectId = Number(dto.projectId);
    await this.ensureProject(projectId);

    if (dto.checklistId) await this.ensureChecklist(Number(dto.checklistId), projectId);
    if (dto.inspectorId) await this.ensureUser(Number(dto.inspectorId), 'Inspector not found');

    const code = this.requiredText(dto.code, 'Inspection code').toUpperCase();

    const duplicate = await this.prisma.inspection.findFirst({
      where: { projectId, code },
      select: { id: true },
    });

    if (duplicate) {
      throw new BadRequestException('Inspection code already exists for this project');
    }

    const inspection = await this.prisma.inspection.create({
      data: {
        projectId,
        checklistId: dto.checklistId ? Number(dto.checklistId) : null,
        code,
        title: this.requiredText(dto.title, 'Title'),
        location: this.nullIfEmpty(dto.location),
        inspectionDate: dto.inspectionDate ? this.normalizeDate(dto.inspectionDate) : null,
        status: this.normalizeInspectionStatus(dto.status ?? 'PLANNED'),
        result: this.nullIfEmpty(dto.result),
        createdById: userId ?? null,
        inspectorId: dto.inspectorId ? Number(dto.inspectorId) : null,
      },
      include: this.inspectionInclude(),
    });

    await this.auditService.create({
      userId,
      projectId: inspection.projectId,
      action: AuditAction.CREATE,
      module: 'quality',
      entityName: 'Inspection',
      entityId: String(inspection.id),
      description: `Created inspection ${inspection.code}`,
      newData: inspection,
    });

    return inspection;
  }

  async findInspections(projectId: number) {
    await this.ensureProject(projectId);

    return this.prisma.inspection.findMany({
      where: { projectId },
      include: this.inspectionInclude(),
      orderBy: [{ inspectionDate: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async findInspection(id: number) {
    const inspection = await this.prisma.inspection.findUnique({
      where: { id },
      include: this.inspectionInclude(),
    });

    if (!inspection) throw new NotFoundException('Inspection not found');
    return inspection;
  }

  async updateInspection(id: number, dto: UpdateInspectionDto, userId?: number) {
    const oldInspection = await this.findInspection(id);
    const projectId = dto.projectId ? Number(dto.projectId) : oldInspection.projectId;

    if (dto.projectId) await this.ensureProject(projectId);
    if (dto.checklistId) await this.ensureChecklist(Number(dto.checklistId), projectId);
    if (dto.inspectorId) await this.ensureUser(Number(dto.inspectorId), 'Inspector not found');

    const nextCode = dto.code
      ? this.requiredText(dto.code, 'Inspection code').toUpperCase()
      : oldInspection.code;

    if (dto.code || dto.projectId) {
      const duplicate = await this.prisma.inspection.findFirst({
        where: { projectId, code: nextCode, NOT: { id } },
        select: { id: true },
      });

      if (duplicate) {
        throw new BadRequestException('Inspection code already exists for this project');
      }
    }

    const updated = await this.prisma.inspection.update({
      where: { id },
      data: {
        projectId: dto.projectId ? projectId : undefined,
        checklistId:
          dto.checklistId !== undefined
            ? dto.checklistId
              ? Number(dto.checklistId)
              : null
            : undefined,
        code: dto.code !== undefined ? nextCode : undefined,
        title: dto.title !== undefined ? this.requiredText(dto.title, 'Title') : undefined,
        location: dto.location !== undefined ? this.nullIfEmpty(dto.location) : undefined,
        inspectionDate:
          dto.inspectionDate !== undefined
            ? dto.inspectionDate
              ? this.normalizeDate(dto.inspectionDate)
              : null
            : undefined,
        status: dto.status !== undefined ? this.normalizeInspectionStatus(dto.status) : undefined,
        result: dto.result !== undefined ? this.nullIfEmpty(dto.result) : undefined,
        inspectorId:
          dto.inspectorId !== undefined
            ? dto.inspectorId
              ? Number(dto.inspectorId)
              : null
            : undefined,
      },
      include: this.inspectionInclude(),
    });

    await this.auditService.create({
      userId,
      projectId: updated.projectId,
      action: AuditAction.UPDATE,
      module: 'quality',
      entityName: 'Inspection',
      entityId: String(id),
      description: `Updated inspection ${updated.code}`,
      oldData: oldInspection,
      newData: updated,
    });

    return updated;
  }

  async removeInspection(id: number, userId?: number) {
    const oldInspection = await this.findInspection(id);

    const deleted = await this.prisma.inspection.delete({ where: { id } });

    await this.auditService.create({
      userId,
      projectId: oldInspection.projectId,
      action: AuditAction.DELETE,
      module: 'quality',
      entityName: 'Inspection',
      entityId: String(id),
      description: `Deleted inspection ${oldInspection.code}`,
      oldData: oldInspection,
      newData: deleted,
    });

    return deleted;
  }

  async createNcr(dto: CreateNcrDto, userId?: number) {
    const projectId = Number(dto.projectId);
    await this.ensureProject(projectId);

    if (dto.assignedToId) await this.ensureUser(Number(dto.assignedToId), 'Assigned user not found');

    const code = this.requiredText(dto.code, 'NCR code').toUpperCase();

    const duplicate = await this.prisma.ncrReport.findFirst({
      where: { projectId, code },
      select: { id: true },
    });

    if (duplicate) {
      throw new BadRequestException('NCR code already exists for this project');
    }

    const status = this.normalizeNcrStatus(dto.status ?? 'OPEN');

    const ncr = await this.prisma.ncrReport.create({
      data: {
        projectId,
        code,
        title: this.requiredText(dto.title, 'Title'),
        description: this.requiredText(dto.description, 'Description'),
        status,
        correctiveAction: this.nullIfEmpty(dto.correctiveAction),
        dueDate: dto.dueDate ? this.normalizeDate(dto.dueDate) : null,
        closedAt: status === 'CLOSED' ? new Date() : null,
        createdById: userId ?? null,
        assignedToId: dto.assignedToId ? Number(dto.assignedToId) : null,
      },
      include: this.ncrInclude(),
    });

    await this.auditService.create({
      userId,
      projectId: ncr.projectId,
      action: AuditAction.CREATE,
      module: 'quality',
      entityName: 'NcrReport',
      entityId: String(ncr.id),
      description: `Created NCR ${ncr.code}`,
      newData: ncr,
    });

    return ncr;
  }

  async findNcrs(projectId: number) {
    await this.ensureProject(projectId);

    return this.prisma.ncrReport.findMany({
      where: { projectId },
      include: this.ncrInclude(),
      orderBy: [{ status: 'asc' }, { dueDate: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async findNcr(id: number) {
    const ncr = await this.prisma.ncrReport.findUnique({
      where: { id },
      include: this.ncrInclude(),
    });

    if (!ncr) throw new NotFoundException('NCR not found');
    return ncr;
  }

  async updateNcr(id: number, dto: UpdateNcrDto, userId?: number) {
    const oldNcr = await this.findNcr(id);
    const projectId = dto.projectId ? Number(dto.projectId) : oldNcr.projectId;

    if (dto.projectId) await this.ensureProject(projectId);
    if (dto.assignedToId) await this.ensureUser(Number(dto.assignedToId), 'Assigned user not found');

    const nextCode = dto.code ? this.requiredText(dto.code, 'NCR code').toUpperCase() : oldNcr.code;

    if (dto.code || dto.projectId) {
      const duplicate = await this.prisma.ncrReport.findFirst({
        where: { projectId, code: nextCode, NOT: { id } },
        select: { id: true },
      });

      if (duplicate) throw new BadRequestException('NCR code already exists for this project');
    }

    const nextStatus = dto.status !== undefined ? this.normalizeNcrStatus(dto.status) : undefined;

    const updated = await this.prisma.ncrReport.update({
      where: { id },
      data: {
        projectId: dto.projectId ? projectId : undefined,
        code: dto.code !== undefined ? nextCode : undefined,
        title: dto.title !== undefined ? this.requiredText(dto.title, 'Title') : undefined,
        description: dto.description !== undefined ? this.requiredText(dto.description, 'Description') : undefined,
        status: nextStatus,
        correctiveAction:
          dto.correctiveAction !== undefined ? this.nullIfEmpty(dto.correctiveAction) : undefined,
        dueDate:
          dto.dueDate !== undefined
            ? dto.dueDate
              ? this.normalizeDate(dto.dueDate)
              : null
            : undefined,
        closedAt:
          nextStatus !== undefined
            ? nextStatus === 'CLOSED'
              ? new Date()
              : null
            : undefined,
        assignedToId:
          dto.assignedToId !== undefined
            ? dto.assignedToId
              ? Number(dto.assignedToId)
              : null
            : undefined,
      },
      include: this.ncrInclude(),
    });

    await this.auditService.create({
      userId,
      projectId: updated.projectId,
      action: AuditAction.UPDATE,
      module: 'quality',
      entityName: 'NcrReport',
      entityId: String(id),
      description: `Updated NCR ${updated.code}`,
      oldData: oldNcr,
      newData: updated,
    });

    return updated;
  }

  async closeNcr(id: number, userId?: number) {
    const oldNcr = await this.findNcr(id);

    if (oldNcr.status === 'CLOSED') throw new BadRequestException('NCR is already closed');

    const updated = await this.prisma.ncrReport.update({
      where: { id },
      data: { status: 'CLOSED', closedAt: new Date() },
      include: this.ncrInclude(),
    });

    await this.auditService.create({
      userId,
      projectId: updated.projectId,
      action: AuditAction.UPDATE,
      module: 'quality',
      entityName: 'NcrReport',
      entityId: String(id),
      description: `Closed NCR ${updated.code}`,
      oldData: oldNcr,
      newData: updated,
    });

    return updated;
  }

  async reopenNcr(id: number, userId?: number) {
    const oldNcr = await this.findNcr(id);

    if (oldNcr.status !== 'CLOSED') throw new BadRequestException('Only closed NCRs can be reopened');

    const updated = await this.prisma.ncrReport.update({
      where: { id },
      data: { status: 'OPEN', closedAt: null },
      include: this.ncrInclude(),
    });

    await this.auditService.create({
      userId,
      projectId: updated.projectId,
      action: AuditAction.UPDATE,
      module: 'quality',
      entityName: 'NcrReport',
      entityId: String(id),
      description: `Reopened NCR ${updated.code}`,
      oldData: oldNcr,
      newData: updated,
    });

    return updated;
  }

  async removeNcr(id: number, userId?: number) {
    const oldNcr = await this.findNcr(id);

    if (oldNcr.status === 'CLOSED') throw new BadRequestException('Closed NCR cannot be deleted');

    const deleted = await this.prisma.ncrReport.delete({ where: { id } });

    await this.auditService.create({
      userId,
      projectId: oldNcr.projectId,
      action: AuditAction.DELETE,
      module: 'quality',
      entityName: 'NcrReport',
      entityId: String(id),
      description: `Deleted NCR ${oldNcr.code}`,
      oldData: oldNcr,
      newData: deleted,
    });

    return deleted;
  }

  private checklistInclude(): Prisma.QualityChecklistInclude {
    return {
      project: { select: { id: true, code: true, name: true } },
      inspections: { orderBy: { createdAt: 'desc' as const } },
    };
  }

  private inspectionInclude(): Prisma.InspectionInclude {
    return {
      project: { select: { id: true, code: true, name: true } },
      checklist: true,
      createdBy: { select: { id: true, name: true, email: true, jobTitle: true } },
      inspector: { select: { id: true, name: true, email: true, jobTitle: true } },
    };
  }

  private ncrInclude(): Prisma.NcrReportInclude {
    return {
      project: { select: { id: true, code: true, name: true } },
      createdBy: { select: { id: true, name: true, email: true, jobTitle: true } },
      assignedTo: { select: { id: true, name: true, email: true, jobTitle: true } },
    };
  }

  private async ensureProject(projectId: number) {
    if (!projectId) throw new BadRequestException('Project is required');

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true },
    });

    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  private async ensureChecklist(checklistId: number, projectId: number) {
    const checklist = await this.prisma.qualityChecklist.findUnique({
      where: { id: checklistId },
      select: { id: true, projectId: true },
    });

    if (!checklist || checklist.projectId !== projectId) {
      throw new BadRequestException('Invalid checklist for this project');
    }
  }

  private async ensureUser(id: number, message: string) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: { id: true } });
    if (!user) throw new NotFoundException(message);
  }

  private normalizeInspectionStatus(status: string) {
    const value = String(status || '').trim().toUpperCase();
    if (!inspectionStatuses.includes(value)) throw new BadRequestException('Invalid inspection status');
    return value as any;
  }

  private normalizeNcrStatus(status: string) {
    const value = String(status || '').trim().toUpperCase();
    if (!ncrStatuses.includes(value)) throw new BadRequestException('Invalid NCR status');
    return value as any;
  }

  private normalizeDate(value: string | Date) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) throw new BadRequestException('Invalid date');
    date.setHours(0, 0, 0, 0);
    return date;
  }

  private requiredText(value: unknown, label: string) {
    const text = String(value ?? '').trim();
    if (!text) throw new BadRequestException(`${label} is required`);
    return text;
  }

  private nullIfEmpty(value?: string | null) {
    if (value === undefined || value === null) return null;
    const text = String(value).trim();
    return text || null;
  }
}
