import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction, Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRfiDto } from './dto/create-rfi.dto';
import { RespondRfiDto } from './dto/respond-rfi.dto';
import { UpdateRfiDto } from './dto/update-rfi.dto';

const allowedStatuses = ['DRAFT', 'OPEN', 'ANSWERED', 'CLOSED', 'REJECTED'];
const allowedPriorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

@Injectable()
export class RfisService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async create(dto: CreateRfiDto, userId?: number) {
    const projectId = Number(dto.projectId);
    if (!projectId) throw new BadRequestException('Project is required'); 

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true },
    });

    if (!project) throw new NotFoundException('Project not found');

    if (dto.assignedToId) {
      await this.validateUser(Number(dto.assignedToId));
    }

const code = await this.generateRfiCode(projectId);

    const rfi = await this.prisma.rfi.create({
      data: {
        projectId,
        code,
        title: this.requiredText(dto.title, 'Title'),
        question: this.requiredText(dto.question, 'Question'),
        status: this.normalizeStatus(dto.status ?? 'OPEN'),
        priority: this.normalizePriority(dto.priority ?? 'MEDIUM'),
        assignedToId: dto.assignedToId ? Number(dto.assignedToId) : null,
        dueDate: dto.dueDate ? this.normalizeDate(dto.dueDate) : null,
        createdById: userId ?? null,
      },
      include: this.rfiInclude(),
    });

    await this.auditService.create({
      userId,
      projectId: rfi.projectId,
      action: AuditAction.CREATE,
      module: 'rfis',
      entityName: 'RFI',
      entityId: String(rfi.id),
      description: `Created RFI ${rfi.code}`,
      newData: rfi,
    });

    return rfi;
  }

  async findByProject(projectId: number) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true },
    });

    if (!project) throw new NotFoundException('Project not found');

    return this.prisma.rfi.findMany({
      where: { projectId },
      include: this.rfiInclude(),
      orderBy: [{ status: 'asc' }, { dueDate: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async findOne(id: number) {
    const rfi = await this.prisma.rfi.findUnique({
      where: { id },
      include: this.rfiInclude(),
    });

    if (!rfi) throw new NotFoundException('RFI not found');
    return rfi;
  }

  async update(id: number, dto: UpdateRfiDto, userId?: number) {
    const oldRfi = await this.findOne(id);

    if (String(oldRfi.status) === 'CLOSED') {
      throw new BadRequestException('Closed RFI cannot be edited. Reopen it first.');
    }

    if (dto.assignedToId) {
      await this.validateUser(Number(dto.assignedToId));
    }

    const nextCode = dto.code
      ? this.requiredText(dto.code, 'RFI code').toUpperCase()
      : oldRfi.code;

    if (dto.code) {
      const duplicate = await this.prisma.rfi.findFirst({
        where: {
          projectId: oldRfi.projectId,
          code: nextCode,
          NOT: { id },
        },
        select: { id: true },
      });

      if (duplicate) {
        throw new BadRequestException('RFI code already exists for this project');
      }
    }

    const updated = await this.prisma.rfi.update({
      where: { id },
      data: {
        code: dto.code !== undefined ? nextCode : undefined,
        title: dto.title !== undefined ? this.requiredText(dto.title, 'Title') : undefined,
        question:
          dto.question !== undefined
            ? this.requiredText(dto.question, 'Question')
            : undefined,
        priority:
          dto.priority !== undefined
            ? this.normalizePriority(dto.priority)
            : undefined,
        status:
          dto.status !== undefined ? this.normalizeStatus(dto.status) : undefined,
        assignedToId:
          dto.assignedToId !== undefined
            ? dto.assignedToId
              ? Number(dto.assignedToId)
              : null
            : undefined,
        dueDate: dto.dueDate !== undefined ? (dto.dueDate ? this.normalizeDate(dto.dueDate) : null) : undefined,
      },
      include: this.rfiInclude(),
    });

    await this.auditService.create({
      userId,
      projectId: updated.projectId,
      action: AuditAction.UPDATE,
      module: 'rfis',
      entityName: 'RFI',
      entityId: String(id),
      description: `Updated RFI ${updated.code}`,
      oldData: oldRfi,
      newData: updated,
    });

    return updated;
  }

  async respond(id: number, dto: RespondRfiDto, userId?: number) {
    const oldRfi = await this.findOne(id);
    const status = String(oldRfi.status);

    if (status === 'CLOSED' || status === 'REJECTED') {
      throw new BadRequestException('Cannot respond to closed/rejected RFI');
    }

    const updated = await this.prisma.rfi.update({
      where: { id },
      data: {
        response: this.requiredText(dto.response, 'Response'),
        answeredAt: new Date(),
        status: this.normalizeStatus(dto.status ?? 'ANSWERED'),
      },
      include: this.rfiInclude(),
    });

    await this.auditService.create({
      userId,
      projectId: updated.projectId,
      action: AuditAction.UPDATE,
      module: 'rfis',
      entityName: 'RFI',
      entityId: String(id),
      description: `Responded to RFI ${updated.code}`,
      oldData: oldRfi,
      newData: updated,
    });

    return updated;
  }

  async close(id: number, userId?: number) {
    const oldRfi = await this.findOne(id);

    if (String(oldRfi.status) === 'CLOSED') {
      throw new BadRequestException('RFI is already closed');
    }

    const updated = await this.prisma.rfi.update({
      where: { id },
      data: {
        status: 'CLOSED',
        closedAt: new Date(),
      },
      include: this.rfiInclude(),
    });

    await this.auditService.create({
      userId,
      projectId: updated.projectId,
      action: AuditAction.UPDATE,
      module: 'rfis',
      entityName: 'RFI',
      entityId: String(id),
      description: `Closed RFI ${updated.code}`,
      oldData: oldRfi,
      newData: updated,
    });

    return updated;
  }

  async reopen(id: number, userId?: number) {
    const oldRfi = await this.findOne(id);

    if (String(oldRfi.status) !== 'CLOSED') {
      throw new BadRequestException('Only closed RFIs can be reopened');
    }

    const updated = await this.prisma.rfi.update({
      where: { id },
      data: {
        status: oldRfi.response ? 'ANSWERED' : 'OPEN',
        closedAt: null,
      },
      include: this.rfiInclude(),
    });

    await this.auditService.create({
      userId,
      projectId: updated.projectId,
      action: AuditAction.UPDATE,
      module: 'rfis',
      entityName: 'RFI',
      entityId: String(id),
      description: `Reopened RFI ${updated.code}`,
      oldData: oldRfi,
      newData: updated,
    });

    return updated;
  }

  async reject(id: number, response?: string, userId?: number) {
    const oldRfi = await this.findOne(id);

    if (String(oldRfi.status) === 'CLOSED') {
      throw new BadRequestException('Closed RFI cannot be rejected');
    }

    const updated = await this.prisma.rfi.update({
      where: { id },
      data: {
        status: 'REJECTED',
        response: response?.trim() || oldRfi.response,
        answeredAt: new Date(),
      },
      include: this.rfiInclude(),
    });

    await this.auditService.create({
      userId,
      projectId: updated.projectId,
      action: AuditAction.UPDATE,
      module: 'rfis',
      entityName: 'RFI',
      entityId: String(id),
      description: `Rejected RFI ${updated.code}`,
      oldData: oldRfi,
      newData: updated,
    });

    return updated;
  }

  async remove(id: number, userId?: number) {
    const oldRfi = await this.findOne(id);

    if (String(oldRfi.status) === 'CLOSED') {
      throw new BadRequestException('Closed RFI cannot be deleted');
    }

    const deleted = await this.prisma.rfi.delete({
      where: { id },
    });

    await this.auditService.create({
      userId,
      projectId: oldRfi.projectId,
      action: AuditAction.DELETE,
      module: 'rfis',
      entityName: 'RFI',
      entityId: String(id),
      description: `Deleted RFI ${oldRfi.code}`,
      oldData: oldRfi,
      newData: deleted,
    });

    return deleted;
  }

  private rfiInclude(): Prisma.RfiInclude {
    return {
      project: {
        select: { id: true, code: true, name: true },
      },
      createdBy: {
        select: { id: true, name: true, email: true, jobTitle: true },
      },
      assignedTo: {
        select: { id: true, name: true, email: true, jobTitle: true },
      },
    };
  }

  private async validateUser(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!user) throw new NotFoundException('Assigned user not found');
  }
private async generateRfiCode(projectId: number) {
  const latest = await this.prisma.rfi.findFirst({
    where: { projectId },
    orderBy: { id: 'desc' },
    select: { code: true },
  });

  const latestNumber = Number(
    String(latest?.code || 'RFI-000').replace('RFI-', ''),
  );

  return `RFI-${String(latestNumber + 1).padStart(3, '0')}`;
}
  private normalizeStatus(status: string) {
    const value = String(status || '').trim().toUpperCase();
    if (!allowedStatuses.includes(value)) {
      throw new BadRequestException('Invalid RFI status');
    }
    return value as any;
  }

  private normalizePriority(priority: string) {
    const value = String(priority || '').trim().toUpperCase();
    if (!allowedPriorities.includes(value)) {
      throw new BadRequestException('Invalid RFI priority');
    }
    return value as any;
  }

  private normalizeDate(value: string | Date) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Invalid due date');
    }
    date.setHours(0, 0, 0, 0);
    return date;
  }

  private requiredText(value: unknown, label: string) {
    const text = String(value ?? '').trim();
    if (!text) throw new BadRequestException(`${label} is required`);
    return text;
  }
}
