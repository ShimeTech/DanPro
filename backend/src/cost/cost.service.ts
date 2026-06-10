import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBoqItemDto } from './dto/create-boq-item.dto';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { CreateVariationDto } from './dto/create-variation.dto';
import { UpdateBoqItemDto } from './dto/update-boq-item.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { UpdateVariationDto } from './dto/update-variation.dto';

const costStatuses = ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'CANCELLED'];
const expenseTypes = ['MATERIAL', 'LABOR', 'EQUIPMENT', 'SUBCONTRACTOR', 'GENERAL', 'OTHER'];

@Injectable()
export class CostService {
  private readonly db: any;

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {
    this.db = prisma as any;
  }

  async createBoqItem(dto: CreateBoqItemDto, userId?: number) {
    await this.ensureProject(Number(dto.projectId));
    const code = this.requiredText(dto.code, 'BOQ code').toUpperCase();
    await this.ensureUnique('boqItem', Number(dto.projectId), code);

    const quantity = this.positiveNumber(dto.quantity, 'Quantity');
    const unitRate = this.nonNegativeNumber(dto.unitRate, 'Unit rate');
    const totalAmount = quantity * unitRate;

    const item = await this.db.boqItem.create({
      data: {
        projectId: Number(dto.projectId),
        code,
        description: this.requiredText(dto.description, 'Description'),
        unit: this.requiredText(dto.unit, 'Unit'),
        quantity,
        unitRate,
        totalAmount,
      },
      include: this.projectInclude(),
    });

    await this.audit('CREATE', userId, item.projectId, 'BoqItem', item.id, `Created BOQ item ${item.code}`, undefined, item);
    return item;
  }

  async findBoqItems(projectId: number) {
    await this.ensureProject(projectId);
    return this.db.boqItem.findMany({
      where: { projectId },
      include: this.projectInclude(),
      orderBy: { code: 'asc' },
    });
  }

  async findBoqItem(id: number) {
    const item = await this.db.boqItem.findUnique({ where: { id }, include: this.projectInclude() });
    if (!item) throw new NotFoundException('BOQ item not found');
    return item;
  }

  async updateBoqItem(id: number, dto: UpdateBoqItemDto, userId?: number) {
    const oldItem = await this.findBoqItem(id);
    const projectId = dto.projectId ? Number(dto.projectId) : oldItem.projectId;
    if (dto.projectId) await this.ensureProject(projectId);

    const code = dto.code ? this.requiredText(dto.code, 'BOQ code').toUpperCase() : oldItem.code;
    if (dto.code || dto.projectId) await this.ensureUnique('boqItem', projectId, code, id);

    const quantity = dto.quantity !== undefined ? this.positiveNumber(dto.quantity, 'Quantity') : Number(oldItem.quantity);
    const unitRate = dto.unitRate !== undefined ? this.nonNegativeNumber(dto.unitRate, 'Unit rate') : Number(oldItem.unitRate);

    const updated = await this.db.boqItem.update({
      where: { id },
      data: {
        projectId: dto.projectId ? projectId : undefined,
        code: dto.code !== undefined ? code : undefined,
        description: dto.description !== undefined ? this.requiredText(dto.description, 'Description') : undefined,
        unit: dto.unit !== undefined ? this.requiredText(dto.unit, 'Unit') : undefined,
        quantity,
        unitRate,
        totalAmount: quantity * unitRate,
      },
      include: this.projectInclude(),
    });

    await this.audit('UPDATE', userId, updated.projectId, 'BoqItem', id, `Updated BOQ item ${updated.code}`, oldItem, updated);
    return updated;
  }

  async removeBoqItem(id: number, userId?: number) {
    const oldItem = await this.findBoqItem(id);
    const deleted = await this.db.boqItem.delete({ where: { id } });
    await this.audit('DELETE', userId, oldItem.projectId, 'BoqItem', id, `Deleted BOQ item ${oldItem.code}`, oldItem, deleted);
    return deleted;
  }

  async createBudget(dto: CreateBudgetDto, userId?: number) {
    await this.ensureProject(Number(dto.projectId));
    const code = this.requiredText(dto.code, 'Budget code').toUpperCase();
    await this.ensureUnique('budget', Number(dto.projectId), code);

    const budget = await this.db.budget.create({
      data: {
        projectId: Number(dto.projectId),
        code,
        title: this.requiredText(dto.title, 'Title'),
        description: this.nullIfEmpty(dto.description),
        amount: this.nonNegativeNumber(dto.amount, 'Amount'),
        status: this.normalizeStatus(dto.status ?? 'DRAFT'),
      },
      include: this.projectInclude(),
    });

    await this.audit('CREATE', userId, budget.projectId, 'Budget', budget.id, `Created budget ${budget.code}`, undefined, budget);
    return budget;
  }

  async findBudgets(projectId: number) {
    await this.ensureProject(projectId);
    return this.db.budget.findMany({ where: { projectId }, include: this.projectInclude(), orderBy: { createdAt: 'desc' } });
  }

  async findBudget(id: number) {
    const budget = await this.db.budget.findUnique({ where: { id }, include: this.projectInclude() });
    if (!budget) throw new NotFoundException('Budget not found');
    return budget;
  }

  async updateBudget(id: number, dto: UpdateBudgetDto, userId?: number) {
    const oldBudget = await this.findBudget(id);
    const projectId = dto.projectId ? Number(dto.projectId) : oldBudget.projectId;
    if (dto.projectId) await this.ensureProject(projectId);

    const code = dto.code ? this.requiredText(dto.code, 'Budget code').toUpperCase() : oldBudget.code;
    if (dto.code || dto.projectId) await this.ensureUnique('budget', projectId, code, id);

    const updated = await this.db.budget.update({
      where: { id },
      data: {
        projectId: dto.projectId ? projectId : undefined,
        code: dto.code !== undefined ? code : undefined,
        title: dto.title !== undefined ? this.requiredText(dto.title, 'Title') : undefined,
        description: dto.description !== undefined ? this.nullIfEmpty(dto.description) : undefined,
        amount: dto.amount !== undefined ? this.nonNegativeNumber(dto.amount, 'Amount') : undefined,
        status: dto.status !== undefined ? this.normalizeStatus(dto.status) : undefined,
      },
      include: this.projectInclude(),
    });

    await this.audit('UPDATE', userId, updated.projectId, 'Budget', id, `Updated budget ${updated.code}`, oldBudget, updated);
    return updated;
  }

  approveBudget(id: number, userId?: number) {
    return this.changeBudgetStatus(id, 'APPROVED', userId, 'Approved');
  }

  rejectBudget(id: number, userId?: number) {
    return this.changeBudgetStatus(id, 'REJECTED', userId, 'Rejected');
  }

  async removeBudget(id: number, userId?: number) {
    const oldBudget = await this.findBudget(id);
    if (oldBudget.status === 'APPROVED') throw new BadRequestException('Approved budget cannot be deleted');
    const deleted = await this.db.budget.delete({ where: { id } });
    await this.audit('DELETE', userId, oldBudget.projectId, 'Budget', id, `Deleted budget ${oldBudget.code}`, oldBudget, deleted);
    return deleted;
  }

  async createExpense(dto: CreateExpenseDto, userId?: number) {
    await this.ensureProject(Number(dto.projectId));
    const code = this.requiredText(dto.code, 'Expense code').toUpperCase();
    await this.ensureUnique('expense', Number(dto.projectId), code);

    const expense = await this.db.expense.create({
      data: {
        projectId: Number(dto.projectId),
        code,
        description: this.requiredText(dto.description, 'Description'),
        type: this.normalizeExpenseType(dto.type ?? 'OTHER'),
        amount: this.nonNegativeNumber(dto.amount, 'Amount'),
        expenseDate: this.normalizeDate(dto.expenseDate),
        reference: this.nullIfEmpty(dto.reference),
        paidTo: this.nullIfEmpty(dto.paidTo),
      },
      include: this.projectInclude(),
    });

    await this.audit('CREATE', userId, expense.projectId, 'Expense', expense.id, `Created expense ${expense.code}`, undefined, expense);
    return expense;
  }

  async findExpenses(projectId: number) {
    await this.ensureProject(projectId);
    return this.db.expense.findMany({ where: { projectId }, include: this.projectInclude(), orderBy: { expenseDate: 'desc' } });
  }

  async findExpense(id: number) {
    const expense = await this.db.expense.findUnique({ where: { id }, include: this.projectInclude() });
    if (!expense) throw new NotFoundException('Expense not found');
    return expense;
  }

  async updateExpense(id: number, dto: UpdateExpenseDto, userId?: number) {
    const oldExpense = await this.findExpense(id);
    const projectId = dto.projectId ? Number(dto.projectId) : oldExpense.projectId;
    if (dto.projectId) await this.ensureProject(projectId);

    const code = dto.code ? this.requiredText(dto.code, 'Expense code').toUpperCase() : oldExpense.code;
    if (dto.code || dto.projectId) await this.ensureUnique('expense', projectId, code, id);

    const updated = await this.db.expense.update({
      where: { id },
      data: {
        projectId: dto.projectId ? projectId : undefined,
        code: dto.code !== undefined ? code : undefined,
        description: dto.description !== undefined ? this.requiredText(dto.description, 'Description') : undefined,
        type: dto.type !== undefined ? this.normalizeExpenseType(dto.type) : undefined,
        amount: dto.amount !== undefined ? this.nonNegativeNumber(dto.amount, 'Amount') : undefined,
        expenseDate: dto.expenseDate !== undefined ? this.normalizeDate(dto.expenseDate) : undefined,
        reference: dto.reference !== undefined ? this.nullIfEmpty(dto.reference) : undefined,
        paidTo: dto.paidTo !== undefined ? this.nullIfEmpty(dto.paidTo) : undefined,
      },
      include: this.projectInclude(),
    });

    await this.audit('UPDATE', userId, updated.projectId, 'Expense', id, `Updated expense ${updated.code}`, oldExpense, updated);
    return updated;
  }

  async removeExpense(id: number, userId?: number) {
    const oldExpense = await this.findExpense(id);
    const deleted = await this.db.expense.delete({ where: { id } });
    await this.audit('DELETE', userId, oldExpense.projectId, 'Expense', id, `Deleted expense ${oldExpense.code}`, oldExpense, deleted);
    return deleted;
  }

  async createVariation(dto: CreateVariationDto, userId?: number) {
    await this.ensureProject(Number(dto.projectId));
    const code = this.requiredText(dto.code, 'Variation code').toUpperCase();
    await this.ensureUnique('variation', Number(dto.projectId), code);
    const status = this.normalizeStatus(dto.status ?? 'DRAFT');

    const variation = await this.db.variation.create({
      data: {
        projectId: Number(dto.projectId),
        code,
        title: this.requiredText(dto.title, 'Title'),
        description: this.requiredText(dto.description, 'Description'),
        amount: this.nonNegativeNumber(dto.amount, 'Amount'),
        status,
        submittedAt: status === 'SUBMITTED' || status === 'APPROVED' ? new Date() : null,
        approvedAt: status === 'APPROVED' ? new Date() : null,
      },
      include: this.projectInclude(),
    });

    await this.audit('CREATE', userId, variation.projectId, 'Variation', variation.id, `Created variation ${variation.code}`, undefined, variation);
    return variation;
  }

  async findVariations(projectId: number) {
    await this.ensureProject(projectId);
    return this.db.variation.findMany({ where: { projectId }, include: this.projectInclude(), orderBy: { createdAt: 'desc' } });
  }

  async findVariation(id: number) {
    const variation = await this.db.variation.findUnique({ where: { id }, include: this.projectInclude() });
    if (!variation) throw new NotFoundException('Variation not found');
    return variation;
  }

  async updateVariation(id: number, dto: UpdateVariationDto, userId?: number) {
    const oldVariation = await this.findVariation(id);
    if (oldVariation.status === 'APPROVED') throw new BadRequestException('Approved variation cannot be edited');

    const projectId = dto.projectId ? Number(dto.projectId) : oldVariation.projectId;
    if (dto.projectId) await this.ensureProject(projectId);

    const code = dto.code ? this.requiredText(dto.code, 'Variation code').toUpperCase() : oldVariation.code;
    if (dto.code || dto.projectId) await this.ensureUnique('variation', projectId, code, id);

    const status = dto.status !== undefined ? this.normalizeStatus(dto.status) : undefined;

    const updated = await this.db.variation.update({
      where: { id },
      data: {
        projectId: dto.projectId ? projectId : undefined,
        code: dto.code !== undefined ? code : undefined,
        title: dto.title !== undefined ? this.requiredText(dto.title, 'Title') : undefined,
        description: dto.description !== undefined ? this.requiredText(dto.description, 'Description') : undefined,
        amount: dto.amount !== undefined ? this.nonNegativeNumber(dto.amount, 'Amount') : undefined,
        status,
        submittedAt: status === 'SUBMITTED' || status === 'APPROVED' ? new Date() : undefined,
        approvedAt: status === 'APPROVED' ? new Date() : undefined,
      },
      include: this.projectInclude(),
    });

    await this.audit('UPDATE', userId, updated.projectId, 'Variation', id, `Updated variation ${updated.code}`, oldVariation, updated);
    return updated;
  }

  submitVariation(id: number, userId?: number) {
    return this.changeVariationStatus(id, 'SUBMITTED', userId, 'Submitted');
  }

  approveVariation(id: number, userId?: number) {
    return this.changeVariationStatus(id, 'APPROVED', userId, 'Approved');
  }

  rejectVariation(id: number, userId?: number) {
    return this.changeVariationStatus(id, 'REJECTED', userId, 'Rejected');
  }

  async removeVariation(id: number, userId?: number) {
    const oldVariation = await this.findVariation(id);
    if (oldVariation.status === 'APPROVED') throw new BadRequestException('Approved variation cannot be deleted');
    const deleted = await this.db.variation.delete({ where: { id } });
    await this.audit('DELETE', userId, oldVariation.projectId, 'Variation', id, `Deleted variation ${oldVariation.code}`, oldVariation, deleted);
    return deleted;
  }

  async getProjectCostSummary(projectId: number) {
    await this.ensureProject(projectId);

    const [boqItems, budgets, expenses, variations] = await Promise.all([
      this.db.boqItem.findMany({ where: { projectId } }),
      this.db.budget.findMany({ where: { projectId, status: 'APPROVED' } }),
      this.db.expense.findMany({ where: { projectId } }),
      this.db.variation.findMany({ where: { projectId, status: 'APPROVED' } }),
    ]);

    const boqTotal = this.sum(boqItems, 'totalAmount');
    const budgetTotal = this.sum(budgets, 'amount');
    const actualCost = this.sum(expenses, 'amount');
    const approvedVariationTotal = this.sum(variations, 'amount');
    const revisedBudget = budgetTotal + approvedVariationTotal;

    return {
      projectId,
      boqTotal,
      budgetTotal,
      approvedVariationTotal,
      revisedBudget,
      actualCost,
      remainingBudget: revisedBudget - actualCost,
      costPerformancePercent: revisedBudget > 0 ? Number(((actualCost / revisedBudget) * 100).toFixed(2)) : 0,
    };
  }

  private async changeBudgetStatus(id: number, status: string, userId?: number, label?: string) {
    const oldBudget = await this.findBudget(id);
    if (oldBudget.status === 'APPROVED' && status !== 'APPROVED') throw new BadRequestException('Approved budget cannot be changed');

    const updated = await this.db.budget.update({
      where: { id },
      data: { status: this.normalizeStatus(status) },
      include: this.projectInclude(),
    });

    await this.audit(status === 'APPROVED' ? 'APPROVE' : status === 'REJECTED' ? 'REJECT' : 'UPDATE', userId, updated.projectId, 'Budget', id, `${label} budget ${updated.code}`, oldBudget, updated);
    return updated;
  }

  private async changeVariationStatus(id: number, status: string, userId?: number, label?: string) {
    const oldVariation = await this.findVariation(id);
    if (oldVariation.status === 'APPROVED') throw new BadRequestException('Approved variation cannot be changed');
    const normalized = this.normalizeStatus(status);

    const updated = await this.db.variation.update({
      where: { id },
      data: {
        status: normalized,
        submittedAt: normalized === 'SUBMITTED' || normalized === 'APPROVED' ? new Date() : undefined,
        approvedAt: normalized === 'APPROVED' ? new Date() : undefined,
      },
      include: this.projectInclude(),
    });

    await this.audit(normalized === 'APPROVED' ? 'APPROVE' : normalized === 'REJECTED' ? 'REJECT' : 'UPDATE', userId, updated.projectId, 'Variation', id, `${label} variation ${updated.code}`, oldVariation, updated);
    return updated;
  }

  private async ensureProject(projectId: number) {
    if (!projectId) throw new BadRequestException('Project is required');
    const project = await this.db.project.findUnique({ where: { id: projectId }, select: { id: true } });
    if (!project) throw new NotFoundException('Project not found');
  }

  private async ensureUnique(model: string, projectId: number, code: string, excludeId?: number) {
    const duplicate = await this.db[model].findFirst({
      where: { projectId, code, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
      select: { id: true },
    });
    if (duplicate) throw new BadRequestException(`${code} already exists for this project`);
  }

  private normalizeStatus(status: string) {
    const value = String(status || '').trim().toUpperCase();
    if (!costStatuses.includes(value)) throw new BadRequestException('Invalid status');
    return value;
  }

  private normalizeExpenseType(type: string) {
    const value = String(type || '').trim().toUpperCase();
    if (!expenseTypes.includes(value)) throw new BadRequestException('Invalid expense type');
    return value;
  }

  private normalizeDate(value: string | Date) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) throw new BadRequestException('Invalid date');
    date.setHours(0, 0, 0, 0);
    return date;
  }

  private positiveNumber(value: unknown, label: string) {
    const number = Number(value);
    if (!Number.isFinite(number) || number <= 0) throw new BadRequestException(`${label} must be greater than zero`);
    return number;
  }

  private nonNegativeNumber(value: unknown, label: string) {
    const number = Number(value);
    if (!Number.isFinite(number) || number < 0) throw new BadRequestException(`${label} cannot be negative`);
    return number;
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

  private sum(items: any[], field: string) {
    return items.reduce((total, item) => total + Number(item[field] || 0), 0);
  }

  private projectInclude() {
    return {
      project: {
        select: { id: true, code: true, name: true },
      },
    };
  }

  private async audit(
    action: keyof typeof AuditAction | string,
    userId: number | undefined,
    projectId: number,
    entityName: string,
    entityId: number,
    description: string,
    oldData?: any,
    newData?: any,
  ) {
    await this.auditService.create({
      userId,
      projectId,
      action: (AuditAction as any)[action] ?? AuditAction.UPDATE,
      module: 'cost',
      entityName,
      entityId: String(entityId),
      description,
      oldData,
      newData,
    });
  }
}