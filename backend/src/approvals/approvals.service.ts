import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction, Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateApprovalDto } from './dto/create-approval.dto';
import { ReviewApprovalDto } from './dto/review-approval.dto';

const allowedApprovalStatuses = ['PENDING', 'APPROVED', 'REJECTED', 'RETURNED', 'CANCELLED'];
const allowedReviewStatuses = ['APPROVED', 'REJECTED', 'RETURNED'];

@Injectable()
export class ApprovalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService, 
  ) {}

  async create(dto: CreateApprovalDto, currentUserId?: number) {
    const projectId = Number(dto.projectId);
    if (!projectId) throw new BadRequestException('Project is required');

    await this.validateProject(projectId);

    if (dto.userId) {
      await this.validateUser(Number(dto.userId), 'Approval user not found');
    }

    const module = this.requiredText(dto.module, 'Module').toLowerCase();
    const entityName = this.requiredText(dto.entityName, 'Entity name');
    const entityId = Number(dto.entityId);

    if (!entityId) throw new BadRequestException('Entity ID is required');

    const duplicatePending = await this.prisma.approval.findFirst({
      where: {
        projectId,
        module,
        entityName,
        entityId,
        status: 'PENDING',
      },
      select: { id: true },
    });

    if (duplicatePending) {
      throw new BadRequestException('A pending approval already exists for this entity');
    }

    const status = this.normalizeStatus(dto.status ?? 'PENDING');

    const approval = await this.prisma.approval.create({
      data: {
        projectId,
        userId: dto.userId ? Number(dto.userId) : currentUserId ?? null,
        status,
        module,
        entityName,
        entityId,
        rfiId: dto.rfiId ? Number(dto.rfiId) : null,
        submittalId: dto.submittalId ? Number(dto.submittalId) : null,
        comments: this.nullIfEmpty(dto.comments),
        approvedAt: ['APPROVED', 'REJECTED', 'RETURNED', 'CANCELLED'].includes(status)
          ? new Date()
          : null,
      },
      include: this.approvalInclude(),
    });

    await this.auditService.create({
      userId: currentUserId,
      projectId: approval.projectId,
      action: AuditAction.CREATE,
      module: 'approvals',
      entityName: 'Approval',
      entityId: String(approval.id),
      description: `Created approval for ${approval.module}:${approval.entityName}:${approval.entityId}`,
      newData: approval,
    });

    return approval;
  }

  async findByProject(projectId: number) {
    await this.validateProject(projectId);

    return this.prisma.approval.findMany({
      where: { projectId },
      include: this.approvalInclude(),
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async findByEntity(module: string, entityName: string, entityId: number) {
    if (!module || !entityName || !entityId) {
      throw new BadRequestException('Module, entity name, and entity ID are required');
    }

    return this.prisma.approval.findMany({
      where: {
        module: module.toLowerCase(),
        entityName,
        entityId,
      },
      include: this.approvalInclude(),
      orderBy: { createdAt: 'desc' },
    });
  }

  async findPendingByUser(userId: number) {
    return this.prisma.approval.findMany({
      where: {
        userId,
        status: 'PENDING',
      },
      include: this.approvalInclude(),
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number) {
    const approval = await this.prisma.approval.findUnique({
      where: { id },
      include: this.approvalInclude(),
    });

    if (!approval) throw new NotFoundException('Approval not found');
    return approval;
  }

  async update(id: number, dto: Partial<CreateApprovalDto>, currentUserId?: number) {
    const oldApproval = await this.findOne(id);

    if (oldApproval.status !== 'PENDING') {
      throw new BadRequestException('Only pending approvals can be edited');
    }

    const projectId = dto.projectId ? Number(dto.projectId) : oldApproval.projectId;
    if (dto.projectId) await this.validateProject(projectId);
    if (dto.userId) await this.validateUser(Number(dto.userId), 'Approval user not found');

    const nextModule = dto.module ? this.requiredText(dto.module, 'Module').toLowerCase() : oldApproval.module;
    const nextEntityName = dto.entityName ? this.requiredText(dto.entityName, 'Entity name') : oldApproval.entityName;
    const nextEntityId = dto.entityId ? Number(dto.entityId) : oldApproval.entityId;

    if (!nextEntityId) throw new BadRequestException('Entity ID is required');

    if (dto.module || dto.entityName || dto.entityId || dto.projectId) {
      const duplicatePending = await this.prisma.approval.findFirst({
        where: {
          projectId,
          module: nextModule,
          entityName: nextEntityName,
          entityId: nextEntityId,
          status: 'PENDING',
          NOT: { id },
        },
        select: { id: true },
      });

      if (duplicatePending) {
        throw new BadRequestException('A pending approval already exists for this entity');
      }
    }

    const updated = await this.prisma.approval.update({
      where: { id },
      data: {
        projectId: dto.projectId ? projectId : undefined,
        userId:
          dto.userId !== undefined
            ? dto.userId
              ? Number(dto.userId)
              : null
            : undefined,
        status: dto.status !== undefined ? this.normalizeStatus(dto.status) : undefined,
        module: dto.module !== undefined ? nextModule : undefined,
        entityName: dto.entityName !== undefined ? nextEntityName : undefined,
        entityId: dto.entityId !== undefined ? nextEntityId : undefined,
        rfiId:
          dto.rfiId !== undefined
            ? dto.rfiId
              ? Number(dto.rfiId)
              : null
            : undefined,
        submittalId:
          dto.submittalId !== undefined
            ? dto.submittalId
              ? Number(dto.submittalId)
              : null
            : undefined,
        comments: dto.comments !== undefined ? this.nullIfEmpty(dto.comments) : undefined,
      },
      include: this.approvalInclude(),
    });

    await this.auditService.create({
      userId: currentUserId,
      projectId: updated.projectId,
      action: AuditAction.UPDATE,
      module: 'approvals',
      entityName: 'Approval',
      entityId: String(id),
      description: `Updated approval ${id}`,
      oldData: oldApproval,
      newData: updated,
    });

    return updated;
  }

  async review(id: number, dto: ReviewApprovalDto, currentUserId?: number) {
    const oldApproval = await this.findOne(id);

    if (oldApproval.status !== 'PENDING') {
      throw new BadRequestException('Only pending approvals can be reviewed');
    }

    const reviewStatus = this.normalizeReviewStatus(dto.status);

    const updated = await this.prisma.approval.update({
      where: { id },
      data: {
        status: reviewStatus,
        userId: currentUserId ?? oldApproval.userId,
        comments: this.nullIfEmpty(dto.comments),
        approvedAt: new Date(),
      },
      include: this.approvalInclude(),
    });

    await this.auditService.create({
      userId: currentUserId,
      projectId: updated.projectId,
      action:
        reviewStatus === 'APPROVED'
          ? AuditAction.APPROVE
          : reviewStatus === 'REJECTED'
            ? AuditAction.REJECT
            : AuditAction.UPDATE,
      module: 'approvals',
      entityName: 'Approval',
      entityId: String(id),
      description: `Reviewed approval ${id} as ${reviewStatus}`,
      oldData: oldApproval,
      newData: updated,
    });

    return updated;
  }

  async cancel(id: number, currentUserId?: number) {
    const oldApproval = await this.findOne(id);

    if (oldApproval.status !== 'PENDING') {
      throw new BadRequestException('Only pending approvals can be cancelled');
    }

    const updated = await this.prisma.approval.update({
      where: { id },
      data: {
        status: 'RETURNED',
        comments: 'Approval cancelled/returned',
        approvedAt: new Date(),
      },
      include: this.approvalInclude(),
    });

    await this.auditService.create({
      userId: currentUserId,
      projectId: updated.projectId,
      action: AuditAction.UPDATE,
      module: 'approvals',
      entityName: 'Approval',
      entityId: String(id),
      description: `Cancelled approval ${id}`,
      oldData: oldApproval,
      newData: updated,
    });

    return updated;
  }

  async reopen(id: number, currentUserId?: number) {
    const oldApproval = await this.findOne(id);

    if (oldApproval.status === 'PENDING') {
      throw new BadRequestException('Approval is already pending');
    }

    const updated = await this.prisma.approval.update({
      where: { id },
      data: {
        status: 'PENDING',
        approvedAt: null,
      },
      include: this.approvalInclude(),
    });

    await this.auditService.create({
      userId: currentUserId,
      projectId: updated.projectId,
      action: AuditAction.UPDATE,
      module: 'approvals',
      entityName: 'Approval',
      entityId: String(id),
      description: `Reopened approval ${id}`,
      oldData: oldApproval,
      newData: updated,
    });

    return updated;
  }

  async remove(id: number, currentUserId?: number) {
    const oldApproval = await this.findOne(id);

    if (oldApproval.status === 'APPROVED') {
      throw new BadRequestException('Approved approval records cannot be deleted');
    }

    const deleted = await this.prisma.approval.delete({ where: { id } });

    await this.auditService.create({
      userId: currentUserId,
      projectId: oldApproval.projectId,
      action: AuditAction.DELETE,
      module: 'approvals',
      entityName: 'Approval',
      entityId: String(id),
      description: `Deleted approval ${id}`,
      oldData: oldApproval,
      newData: deleted,
    });

    return deleted;
  }

  private approvalInclude(): Prisma.ApprovalInclude {
    return {
      project: {
        select: { id: true, code: true, name: true },
      },
      user: {
        select: { id: true, name: true, email: true, jobTitle: true },
      },
      rfi: true,
      submittal: true,
    };
  }

  private async validateProject(projectId: number) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true },
    });
    if (!project) throw new NotFoundException('Project not found');
  }

  private async validateUser(id: number, message: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!user) throw new NotFoundException(message);
  }

  private normalizeStatus(status: string) {
    const value = String(status || '').trim().toUpperCase();
    if (!allowedApprovalStatuses.includes(value)) {
      throw new BadRequestException('Invalid approval status');
    }
    return value as any;
  }

  private normalizeReviewStatus(status: string) {
    const value = String(status || '').trim().toUpperCase();
    if (!allowedReviewStatuses.includes(value)) {
      throw new BadRequestException('Invalid review status');
    }
    return value as any;
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