import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction, Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateIncidentDto } from './dto/create-incident.dto';
import { UpdateIncidentDto } from './dto/update-incident.dto';
import { CreateRiskAssessmentDto } from './dto/create-risk-assessment.dto';
import { UpdateRiskAssessmentDto } from './dto/update-risk-assessment.dto';
import { CreateToolboxTalkDto } from './dto/create-toolbox-talk.dto';
import { UpdateToolboxTalkDto } from './dto/update-toolbox-talk.dto';
import { CreateSafetyInspectionDto } from './dto/create-safety-inspection.dto';
import { UpdateSafetyInspectionDto } from './dto/update-safety-inspection.dto';

const incidentSeverities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const incidentStatuses = ['OPEN', 'INVESTIGATING', 'CLOSED'];
const riskLevels = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

@Injectable()
export class SafetyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async createIncident(dto: CreateIncidentDto, userId?: number) {
    const projectId = Number(dto.projectId);
    await this.ensureProject(projectId);

    const code = this.requiredText(dto.code, 'Incident code').toUpperCase();
    await this.ensureUniqueIncidentCode(projectId, code);

    const status = this.normalizeIncidentStatus(dto.status ?? 'OPEN');

    const incident = await this.prisma.safetyIncident.create({
      data: {
        projectId,
        code,
        title: this.requiredText(dto.title, 'Title'),
        description: this.requiredText(dto.description, 'Description'),
        severity: this.normalizeSeverity(dto.severity ?? 'LOW'),
        status,
        incidentDate: this.normalizeDate(dto.incidentDate),
        location: this.nullIfEmpty(dto.location),
        reporterId: userId ?? null,
        correctiveAction: this.nullIfEmpty(dto.correctiveAction),
        closedAt: status === 'CLOSED' ? new Date() : null,
      },
      include: this.incidentInclude(),
    });

    await this.auditService.create({
      userId,
      projectId: incident.projectId,
      action: AuditAction.CREATE,
      module: 'safety',
      entityName: 'SafetyIncident',
      entityId: String(incident.id),
      description: `Created safety incident ${incident.code}`,
      newData: incident,
    });

    return incident;
  }

  async findIncidents(projectId: number) {
    await this.ensureProject(projectId);

    return this.prisma.safetyIncident.findMany({
      where: { projectId },
      include: this.incidentInclude(),
      orderBy: [{ incidentDate: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async findIncident(id: number) {
    const incident = await this.prisma.safetyIncident.findUnique({
      where: { id },
      include: this.incidentInclude(),
    });

    if (!incident) throw new NotFoundException('Safety incident not found');
    return incident;
  }

  async updateIncident(id: number, dto: UpdateIncidentDto, userId?: number) {
    const oldIncident = await this.findIncident(id);
    const projectId = dto.projectId ? Number(dto.projectId) : oldIncident.projectId;

    if (dto.projectId) await this.ensureProject(projectId);

    const nextCode = dto.code
      ? this.requiredText(dto.code, 'Incident code').toUpperCase()
      : oldIncident.code;

    if (dto.code || dto.projectId) await this.ensureUniqueIncidentCode(projectId, nextCode, id);

    const nextStatus = dto.status !== undefined ? this.normalizeIncidentStatus(dto.status) : undefined;

    const updated = await this.prisma.safetyIncident.update({
      where: { id },
      data: {
        projectId: dto.projectId ? projectId : undefined,
        code: dto.code !== undefined ? nextCode : undefined,
        title: dto.title !== undefined ? this.requiredText(dto.title, 'Title') : undefined,
        description:
          dto.description !== undefined
            ? this.requiredText(dto.description, 'Description')
            : undefined,
        severity: dto.severity !== undefined ? this.normalizeSeverity(dto.severity) : undefined,
        status: nextStatus,
        incidentDate:
          dto.incidentDate !== undefined ? this.normalizeDate(dto.incidentDate) : undefined,
        location: dto.location !== undefined ? this.nullIfEmpty(dto.location) : undefined,
        correctiveAction:
          dto.correctiveAction !== undefined ? this.nullIfEmpty(dto.correctiveAction) : undefined,
        closedAt:
          nextStatus !== undefined
            ? nextStatus === 'CLOSED'
              ? new Date()
              : null
            : undefined,
      },
      include: this.incidentInclude(),
    });

    await this.auditService.create({
      userId,
      projectId: updated.projectId,
      action: AuditAction.UPDATE,
      module: 'safety',
      entityName: 'SafetyIncident',
      entityId: String(id),
      description: `Updated safety incident ${updated.code}`,
      oldData: oldIncident,
      newData: updated,
    });

    return updated;
  }

  async closeIncident(id: number, userId?: number) {
    const oldIncident = await this.findIncident(id);
    if (oldIncident.status === 'CLOSED') throw new BadRequestException('Incident is already closed');

    const updated = await this.prisma.safetyIncident.update({
      where: { id },
      data: { status: 'CLOSED', closedAt: new Date() },
      include: this.incidentInclude(),
    });

    await this.auditService.create({
      userId,
      projectId: updated.projectId,
      action: AuditAction.UPDATE,
      module: 'safety',
      entityName: 'SafetyIncident',
      entityId: String(id),
      description: `Closed safety incident ${updated.code}`,
      oldData: oldIncident,
      newData: updated,
    });

    return updated;
  }

  async reopenIncident(id: number, userId?: number) {
    const oldIncident = await this.findIncident(id);
    if (oldIncident.status !== 'CLOSED') throw new BadRequestException('Only closed incidents can be reopened');

    const updated = await this.prisma.safetyIncident.update({
      where: { id },
      data: { status: 'INVESTIGATING', closedAt: null },
      include: this.incidentInclude(),
    });

    await this.auditService.create({
      userId,
      projectId: updated.projectId,
      action: AuditAction.UPDATE,
      module: 'safety',
      entityName: 'SafetyIncident',
      entityId: String(id),
      description: `Reopened safety incident ${updated.code}`,
      oldData: oldIncident,
      newData: updated,
    });

    return updated;
  }

  async removeIncident(id: number, userId?: number) {
    const oldIncident = await this.findIncident(id);
    if (oldIncident.status === 'CLOSED') throw new BadRequestException('Closed incident cannot be deleted');

    const deleted = await this.prisma.safetyIncident.delete({ where: { id } });

    await this.auditService.create({
      userId,
      projectId: oldIncident.projectId,
      action: AuditAction.DELETE,
      module: 'safety',
      entityName: 'SafetyIncident',
      entityId: String(id),
      description: `Deleted safety incident ${oldIncident.code}`,
      oldData: oldIncident,
      newData: deleted,
    });

    return deleted;
  }

  async createRiskAssessment(dto: CreateRiskAssessmentDto, userId?: number) {
    const projectId = Number(dto.projectId);
    await this.ensureProject(projectId);

    const code = this.requiredText(dto.code, 'Risk assessment code').toUpperCase();
    await this.ensureUniqueRiskCode(projectId, code);

    const riskAssessment = await this.prisma.riskAssessment.create({
      data: {
        projectId,
        code,
        activity: this.requiredText(dto.activity, 'Activity'),
        hazards: this.requiredText(dto.hazards, 'Hazards'),
        risks: this.requiredText(dto.risks, 'Risks'),
        controls: this.nullIfEmpty(dto.controls),
        riskLevel: dto.riskLevel ? this.normalizeRiskLevel(dto.riskLevel) : null,
        reviewDate: dto.reviewDate ? this.normalizeDate(dto.reviewDate) : null,
      },
      include: this.projectOnlyInclude(),
    });

    await this.auditService.create({
      userId,
      projectId: riskAssessment.projectId,
      action: AuditAction.CREATE,
      module: 'safety',
      entityName: 'RiskAssessment',
      entityId: String(riskAssessment.id),
      description: `Created risk assessment ${riskAssessment.code}`,
      newData: riskAssessment,
    });

    return riskAssessment;
  }

  async findRiskAssessments(projectId: number) {
    await this.ensureProject(projectId);

    return this.prisma.riskAssessment.findMany({
      where: { projectId },
      include: this.projectOnlyInclude(),
      orderBy: [{ reviewDate: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async findRiskAssessment(id: number) {
    const risk = await this.prisma.riskAssessment.findUnique({
      where: { id },
      include: this.projectOnlyInclude(),
    });

    if (!risk) throw new NotFoundException('Risk assessment not found');
    return risk;
  }

  async updateRiskAssessment(id: number, dto: UpdateRiskAssessmentDto, userId?: number) {
    const oldRiskAssessment = await this.findRiskAssessment(id);
    const projectId = dto.projectId ? Number(dto.projectId) : oldRiskAssessment.projectId;

    if (dto.projectId) await this.ensureProject(projectId);

    const nextCode = dto.code
      ? this.requiredText(dto.code, 'Risk assessment code').toUpperCase()
      : oldRiskAssessment.code;

    if (dto.code || dto.projectId) await this.ensureUniqueRiskCode(projectId, nextCode, id);

    const updated = await this.prisma.riskAssessment.update({
      where: { id },
      data: {
        projectId: dto.projectId ? projectId : undefined,
        code: dto.code !== undefined ? nextCode : undefined,
        activity: dto.activity !== undefined ? this.requiredText(dto.activity, 'Activity') : undefined,
        hazards: dto.hazards !== undefined ? this.requiredText(dto.hazards, 'Hazards') : undefined,
        risks: dto.risks !== undefined ? this.requiredText(dto.risks, 'Risks') : undefined,
        controls: dto.controls !== undefined ? this.nullIfEmpty(dto.controls) : undefined,
        riskLevel: dto.riskLevel !== undefined ? this.nullIfEmpty(dto.riskLevel) : undefined,
        reviewDate:
          dto.reviewDate !== undefined
            ? dto.reviewDate
              ? this.normalizeDate(dto.reviewDate)
              : null
            : undefined,
      },
      include: this.projectOnlyInclude(),
    });

    await this.auditService.create({
      userId,
      projectId: updated.projectId,
      action: AuditAction.UPDATE,
      module: 'safety',
      entityName: 'RiskAssessment',
      entityId: String(id),
      description: `Updated risk assessment ${updated.code}`,
      oldData: oldRiskAssessment,
      newData: updated,
    });

    return updated;
  }

  async removeRiskAssessment(id: number, userId?: number) {
    const oldRiskAssessment = await this.findRiskAssessment(id);
    const deleted = await this.prisma.riskAssessment.delete({ where: { id } });

    await this.auditService.create({
      userId,
      projectId: oldRiskAssessment.projectId,
      action: AuditAction.DELETE,
      module: 'safety',
      entityName: 'RiskAssessment',
      entityId: String(id),
      description: `Deleted risk assessment ${oldRiskAssessment.code}`,
      oldData: oldRiskAssessment,
      newData: deleted,
    });

    return deleted;
  }

  async createToolboxTalk(dto: CreateToolboxTalkDto, userId?: number) {
    const projectId = Number(dto.projectId);
    await this.ensureProject(projectId);
    await this.ensureUser(dto.leaderId, 'Toolbox talk leader');

    const talk = await this.prisma.toolboxTalk.create({
      data: {
        projectId,
        topic: this.requiredText(dto.topic, 'Topic'),
        talkDate: this.normalizeDate(dto.talkDate),
        attendees: dto.attendees ?? [],
        leaderId: dto.leaderId ?? userId ?? null,
        remarks: this.nullIfEmpty(dto.remarks),
      },
      include: this.toolboxTalkInclude(),
    });

    await this.auditService.create({
      userId,
      projectId: talk.projectId,
      action: AuditAction.CREATE,
      module: 'safety',
      entityName: 'ToolboxTalk',
      entityId: String(talk.id),
      description: `Created toolbox talk ${talk.topic}`,
      newData: talk,
    });

    return talk;
  }

  async findToolboxTalks(projectId: number) {
    await this.ensureProject(projectId);

    return this.prisma.toolboxTalk.findMany({
      where: { projectId },
      include: this.toolboxTalkInclude(),
      orderBy: [{ talkDate: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async findToolboxTalk(id: number) {
    const talk = await this.prisma.toolboxTalk.findUnique({
      where: { id },
      include: this.toolboxTalkInclude(),
    });

    if (!talk) throw new NotFoundException('Toolbox talk not found');
    return talk;
  }

  async updateToolboxTalk(id: number, dto: UpdateToolboxTalkDto, userId?: number) {
    const oldTalk = await this.findToolboxTalk(id);
    const projectId = dto.projectId ? Number(dto.projectId) : oldTalk.projectId;

    if (dto.projectId) await this.ensureProject(projectId);
    await this.ensureUser(dto.leaderId, 'Toolbox talk leader');

    const updated = await this.prisma.toolboxTalk.update({
      where: { id },
      data: {
        projectId: dto.projectId ? projectId : undefined,
        topic: dto.topic !== undefined ? this.requiredText(dto.topic, 'Topic') : undefined,
        talkDate: dto.talkDate !== undefined ? this.normalizeDate(dto.talkDate) : undefined,
        attendees: dto.attendees !== undefined ? dto.attendees : undefined,
        leaderId:
          dto.leaderId !== undefined
            ? dto.leaderId
              ? Number(dto.leaderId)
              : null
            : undefined,
        remarks: dto.remarks !== undefined ? this.nullIfEmpty(dto.remarks) : undefined,
      },
      include: this.toolboxTalkInclude(),
    });

    await this.auditService.create({
      userId,
      projectId: updated.projectId,
      action: AuditAction.UPDATE,
      module: 'safety',
      entityName: 'ToolboxTalk',
      entityId: String(id),
      description: `Updated toolbox talk ${updated.topic}`,
      oldData: oldTalk,
      newData: updated,
    });

    return updated;
  }

  async removeToolboxTalk(id: number, userId?: number) {
    const oldTalk = await this.findToolboxTalk(id);
    const deleted = await this.prisma.toolboxTalk.delete({ where: { id } });

    await this.auditService.create({
      userId,
      projectId: oldTalk.projectId,
      action: AuditAction.DELETE,
      module: 'safety',
      entityName: 'ToolboxTalk',
      entityId: String(id),
      description: `Deleted toolbox talk ${oldTalk.topic}`,
      oldData: oldTalk,
      newData: deleted,
    });

    return deleted;
  }

  async createSafetyInspection(dto: CreateSafetyInspectionDto, userId?: number) {
    const projectId = Number(dto.projectId);
    await this.ensureProject(projectId);
    await this.ensureUser(dto.inspectorId, 'Safety inspector');

    const code = this.requiredText(dto.code, 'Safety inspection code').toUpperCase();
    await this.ensureUniqueSafetyInspectionCode(projectId, code);

    const inspection = await this.prisma.safetyInspection.create({
      data: {
        projectId,
        code,
        inspectionDate: this.normalizeDate(dto.inspectionDate),
        findings: this.nullIfEmpty(dto.findings),
        actions: this.nullIfEmpty(dto.actions),
        inspectorId: dto.inspectorId ?? userId ?? null,
      },
      include: this.safetyInspectionInclude(),
    });

    await this.auditService.create({
      userId,
      projectId: inspection.projectId,
      action: AuditAction.CREATE,
      module: 'safety',
      entityName: 'SafetyInspection',
      entityId: String(inspection.id),
      description: `Created safety inspection ${inspection.code}`,
      newData: inspection,
    });

    return inspection;
  }

  async findSafetyInspections(projectId: number) {
    await this.ensureProject(projectId);

    return this.prisma.safetyInspection.findMany({
      where: { projectId },
      include: this.safetyInspectionInclude(),
      orderBy: [{ inspectionDate: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async findSafetyInspection(id: number) {
    const inspection = await this.prisma.safetyInspection.findUnique({
      where: { id },
      include: this.safetyInspectionInclude(),
    });

    if (!inspection) throw new NotFoundException('Safety inspection not found');
    return inspection;
  }

  async updateSafetyInspection(
    id: number,
    dto: UpdateSafetyInspectionDto,
    userId?: number,
  ) {
    const oldInspection = await this.findSafetyInspection(id);
    const projectId = dto.projectId ? Number(dto.projectId) : oldInspection.projectId;

    if (dto.projectId) await this.ensureProject(projectId);
    await this.ensureUser(dto.inspectorId, 'Safety inspector');

    const nextCode = dto.code
      ? this.requiredText(dto.code, 'Safety inspection code').toUpperCase()
      : oldInspection.code;

    if (dto.code || dto.projectId) {
      await this.ensureUniqueSafetyInspectionCode(projectId, nextCode, id);
    }

    const updated = await this.prisma.safetyInspection.update({
      where: { id },
      data: {
        projectId: dto.projectId ? projectId : undefined,
        code: dto.code !== undefined ? nextCode : undefined,
        inspectionDate:
          dto.inspectionDate !== undefined ? this.normalizeDate(dto.inspectionDate) : undefined,
        findings: dto.findings !== undefined ? this.nullIfEmpty(dto.findings) : undefined,
        actions: dto.actions !== undefined ? this.nullIfEmpty(dto.actions) : undefined,
        inspectorId:
          dto.inspectorId !== undefined
            ? dto.inspectorId
              ? Number(dto.inspectorId)
              : null
            : undefined,
      },
      include: this.safetyInspectionInclude(),
    });

    await this.auditService.create({
      userId,
      projectId: updated.projectId,
      action: AuditAction.UPDATE,
      module: 'safety',
      entityName: 'SafetyInspection',
      entityId: String(id),
      description: `Updated safety inspection ${updated.code}`,
      oldData: oldInspection,
      newData: updated,
    });

    return updated;
  }

  async removeSafetyInspection(id: number, userId?: number) {
    const oldInspection = await this.findSafetyInspection(id);
    const deleted = await this.prisma.safetyInspection.delete({ where: { id } });

    await this.auditService.create({
      userId,
      projectId: oldInspection.projectId,
      action: AuditAction.DELETE,
      module: 'safety',
      entityName: 'SafetyInspection',
      entityId: String(id),
      description: `Deleted safety inspection ${oldInspection.code}`,
      oldData: oldInspection,
      newData: deleted,
    });

    return deleted;
  }

  private incidentInclude(): Prisma.SafetyIncidentInclude {
    return {
      project: { select: { id: true, code: true, name: true } },
      reporter: { select: { id: true, name: true, email: true, jobTitle: true } },
    };
  }

  private projectOnlyInclude() {
    return {
      project: { select: { id: true, code: true, name: true } },
    };
  }

  private toolboxTalkInclude(): Prisma.ToolboxTalkInclude {
    return {
      project: { select: { id: true, code: true, name: true } },
      leader: { select: { id: true, name: true, email: true, jobTitle: true } },
    };
  }

  private safetyInspectionInclude(): Prisma.SafetyInspectionInclude {
    return {
      project: { select: { id: true, code: true, name: true } },
      inspector: { select: { id: true, name: true, email: true, jobTitle: true } },
    };
  }

  private async ensureProject(projectId: number) {
    if (!projectId) throw new BadRequestException('Project is required');

    const project = await this.prisma.project.findUnique({ where: { id: projectId }, select: { id: true } });
    if (!project) throw new NotFoundException('Project not found');
  }

  private async ensureUser(userId?: number | null, label = 'User') {
    if (!userId) return;

    const user = await this.prisma.user.findUnique({ where: { id: Number(userId) }, select: { id: true } });
    if (!user) throw new NotFoundException(`${label} not found`);
  }

  private async ensureUniqueIncidentCode(projectId: number, code: string, excludeId?: number) {
    const duplicate = await this.prisma.safetyIncident.findFirst({
      where: { projectId, code, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
      select: { id: true },
    });
    if (duplicate) throw new BadRequestException('Incident code already exists for this project');
  }

  private async ensureUniqueRiskCode(projectId: number, code: string, excludeId?: number) {
    const duplicate = await this.prisma.riskAssessment.findFirst({
      where: { projectId, code, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
      select: { id: true },
    });
    if (duplicate) throw new BadRequestException('Risk assessment code already exists for this project');
  }

  private async ensureUniqueSafetyInspectionCode(projectId: number, code: string, excludeId?: number) {
    const duplicate = await this.prisma.safetyInspection.findFirst({
      where: { projectId, code, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
      select: { id: true },
    });
    if (duplicate) throw new BadRequestException('Safety inspection code already exists for this project');
  }

  private normalizeSeverity(value: string) {
    const next = String(value || '').trim().toUpperCase();
    if (!incidentSeverities.includes(next)) throw new BadRequestException('Invalid incident severity');
    return next as any;
  }

  private normalizeIncidentStatus(value: string) {
    const next = String(value || '').trim().toUpperCase();
    if (!incidentStatuses.includes(next)) throw new BadRequestException('Invalid incident status');
    return next as any;
  }

  private normalizeRiskLevel(value: string) {
    const next = String(value || '').trim().toUpperCase();
    if (!riskLevels.includes(next)) throw new BadRequestException('Invalid risk level');
    return next;
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
