import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';

const invoiceStatuses = ['DRAFT', 'SENT', 'PARTIALLY_PAID', 'PAID', 'CANCELLED'];
const paymentStatuses = ['PENDING', 'COMPLETED', 'FAILED', 'CANCELLED'];
const paymentTypes = ['ADVANCE', 'PROGRESS', 'RETENTION', 'FINAL', 'OTHER'];

@Injectable()
export class FinanceService {
  private readonly db: any;

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {
    this.db = prisma as any;
  }

  async createInvoice(dto: CreateInvoiceDto, userId?: number) {
    const projectId = Number(dto.projectId);
    await this.ensureProject(projectId);

    const code = this.requiredText(dto.code, 'Invoice code').toUpperCase();
    await this.ensureUnique('invoice', projectId, code);

    const subtotal = this.nonNegativeNumber(dto.subtotal, 'Subtotal');
    const taxAmount = this.nonNegativeNumber(dto.taxAmount ?? 0, 'Tax amount');
    const retentionAmount = this.nonNegativeNumber(dto.retentionAmount ?? 0, 'Retention amount');
    const advanceDeduction = this.nonNegativeNumber(dto.advanceDeduction ?? 0, 'Advance deduction');

    const invoice = await this.db.invoice.create({
      data: {
        projectId,
        code,
        title: this.requiredText(dto.title, 'Title'),
        description: this.nullIfEmpty(dto.description),
        invoiceDate: this.normalizeDate(dto.invoiceDate),
        dueDate: dto.dueDate ? this.normalizeDate(dto.dueDate) : null,
        subtotal,
        taxAmount,
        retentionAmount,
        advanceDeduction,
        totalAmount: this.calculateInvoiceTotal({ subtotal, taxAmount, retentionAmount, advanceDeduction }),
        status: this.normalizeInvoiceStatus(dto.status ?? 'DRAFT'),
      },
      include: this.invoiceInclude(),
    });

    await this.audit('CREATE', userId, invoice.projectId, 'Invoice', invoice.id, `Created invoice ${invoice.code}`, undefined, invoice);
    return invoice;
  }

  async findInvoices(projectId: number) {
    await this.ensureProject(projectId);
    return this.db.invoice.findMany({
      where: { projectId },
      include: this.invoiceInclude(),
      orderBy: { invoiceDate: 'desc' },
    });
  }

  async findInvoice(id: number) {
    const invoice = await this.db.invoice.findUnique({
      where: { id },
      include: this.invoiceInclude(),
    });

    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }

  async updateInvoice(id: number, dto: UpdateInvoiceDto, userId?: number) {
    const oldInvoice = await this.findInvoice(id);

    if (oldInvoice.status === 'PAID' || oldInvoice.status === 'CANCELLED') {
      throw new BadRequestException('Paid or cancelled invoice cannot be edited');
    }

    const projectId = dto.projectId ? Number(dto.projectId) : oldInvoice.projectId;
    if (dto.projectId) await this.ensureProject(projectId);

    const code = dto.code ? this.requiredText(dto.code, 'Invoice code').toUpperCase() : oldInvoice.code;
    if (dto.code || dto.projectId) await this.ensureUnique('invoice', projectId, code, id);

    const subtotal = dto.subtotal !== undefined ? this.nonNegativeNumber(dto.subtotal, 'Subtotal') : Number(oldInvoice.subtotal);
    const taxAmount = dto.taxAmount !== undefined ? this.nonNegativeNumber(dto.taxAmount, 'Tax amount') : Number(oldInvoice.taxAmount);
    const retentionAmount = dto.retentionAmount !== undefined ? this.nonNegativeNumber(dto.retentionAmount, 'Retention amount') : Number(oldInvoice.retentionAmount);
    const advanceDeduction = dto.advanceDeduction !== undefined ? this.nonNegativeNumber(dto.advanceDeduction, 'Advance deduction') : Number(oldInvoice.advanceDeduction);

    const updated = await this.db.invoice.update({
      where: { id },
      data: {
        projectId: dto.projectId ? projectId : undefined,
        code: dto.code !== undefined ? code : undefined,
        title: dto.title !== undefined ? this.requiredText(dto.title, 'Title') : undefined,
        description: dto.description !== undefined ? this.nullIfEmpty(dto.description) : undefined,
        invoiceDate: dto.invoiceDate !== undefined ? this.normalizeDate(dto.invoiceDate) : undefined,
        dueDate: dto.dueDate !== undefined ? dto.dueDate ? this.normalizeDate(dto.dueDate) : null : undefined,
        subtotal,
        taxAmount,
        retentionAmount,
        advanceDeduction,
        totalAmount: this.calculateInvoiceTotal({ subtotal, taxAmount, retentionAmount, advanceDeduction }),
        status: dto.status !== undefined ? this.normalizeInvoiceStatus(dto.status) : undefined,
      },
      include: this.invoiceInclude(),
    });

    await this.audit('UPDATE', userId, updated.projectId, 'Invoice', id, `Updated invoice ${updated.code}`, oldInvoice, updated);
    return updated;
  }

  sendInvoice(id: number, userId?: number) {
    return this.changeInvoiceStatus(id, 'SENT', userId, 'Sent');
  }

  cancelInvoice(id: number, userId?: number) {
    return this.changeInvoiceStatus(id, 'CANCELLED', userId, 'Cancelled');
  }

  async removeInvoice(id: number, userId?: number) {
    const oldInvoice = await this.findInvoice(id);

    if (oldInvoice.payments?.length) {
      throw new BadRequestException('Invoice with payments cannot be deleted. Cancel it instead.');
    }

    const deleted = await this.db.invoice.delete({ where: { id } });
    await this.audit('DELETE', userId, oldInvoice.projectId, 'Invoice', id, `Deleted invoice ${oldInvoice.code}`, oldInvoice, deleted);
    return deleted;
  }

  async createPayment(dto: CreatePaymentDto, userId?: number) {
    const projectId = Number(dto.projectId);
    await this.ensureProject(projectId);
    const invoice = await this.ensureInvoice(dto.invoiceId);

    if (invoice && invoice.projectId !== projectId) {
      throw new BadRequestException('Invoice does not belong to selected project');
    }

    const code = this.requiredText(dto.code, 'Payment code').toUpperCase();
    await this.ensureUnique('payment', projectId, code);

    const payment = await this.db.payment.create({
      data: {
        projectId,
        invoiceId: dto.invoiceId ?? null,
        code,
        type: this.normalizePaymentType(dto.type ?? 'PROGRESS'),
        status: this.normalizePaymentStatus(dto.status ?? 'PENDING'),
        amount: this.positiveNumber(dto.amount, 'Amount'),
        paymentDate: dto.paymentDate ? this.normalizeDate(dto.paymentDate) : null,
        reference: this.nullIfEmpty(dto.reference),
        paidBy: this.nullIfEmpty(dto.paidBy),
        paidTo: this.nullIfEmpty(dto.paidTo),
        notes: this.nullIfEmpty(dto.notes),
      },
      include: this.paymentInclude(),
    });

    if (payment.invoiceId) await this.updateInvoicePaymentStatus(payment.invoiceId);

    await this.audit('CREATE', userId, payment.projectId, 'Payment', payment.id, `Created payment ${payment.code}`, undefined, payment);
    return payment;
  }

  async findPayments(projectId: number) {
    await this.ensureProject(projectId);
    return this.db.payment.findMany({
      where: { projectId },
      include: this.paymentInclude(),
      orderBy: { createdAt: 'desc' },
    });
  }

  async findPayment(id: number) {
    const payment = await this.db.payment.findUnique({
      where: { id },
      include: this.paymentInclude(),
    });

    if (!payment) throw new NotFoundException('Payment not found');
    return payment;
  }

  async updatePayment(id: number, dto: UpdatePaymentDto, userId?: number) {
    const oldPayment = await this.findPayment(id);

    if (oldPayment.status === 'COMPLETED' || oldPayment.status === 'CANCELLED') {
      throw new BadRequestException('Completed or cancelled payment cannot be edited');
    }

    const projectId = dto.projectId ? Number(dto.projectId) : oldPayment.projectId;
    if (dto.projectId) await this.ensureProject(projectId);

    const invoice = await this.ensureInvoice(dto.invoiceId);
    if (invoice && invoice.projectId !== projectId) {
      throw new BadRequestException('Invoice does not belong to selected project');
    }

    const code = dto.code ? this.requiredText(dto.code, 'Payment code').toUpperCase() : oldPayment.code;
    if (dto.code || dto.projectId) await this.ensureUnique('payment', projectId, code, id);

    const updated = await this.db.payment.update({
      where: { id },
      data: {
        projectId: dto.projectId ? projectId : undefined,
        invoiceId: dto.invoiceId !== undefined ? dto.invoiceId || null : undefined,
        code: dto.code !== undefined ? code : undefined,
        type: dto.type !== undefined ? this.normalizePaymentType(dto.type) : undefined,
        status: dto.status !== undefined ? this.normalizePaymentStatus(dto.status) : undefined,
        amount: dto.amount !== undefined ? this.positiveNumber(dto.amount, 'Amount') : undefined,
        paymentDate: dto.paymentDate !== undefined ? dto.paymentDate ? this.normalizeDate(dto.paymentDate) : null : undefined,
        reference: dto.reference !== undefined ? this.nullIfEmpty(dto.reference) : undefined,
        paidBy: dto.paidBy !== undefined ? this.nullIfEmpty(dto.paidBy) : undefined,
        paidTo: dto.paidTo !== undefined ? this.nullIfEmpty(dto.paidTo) : undefined,
        notes: dto.notes !== undefined ? this.nullIfEmpty(dto.notes) : undefined,
      },
      include: this.paymentInclude(),
    });

    if (oldPayment.invoiceId) await this.updateInvoicePaymentStatus(oldPayment.invoiceId);
    if (updated.invoiceId) await this.updateInvoicePaymentStatus(updated.invoiceId);

    await this.audit('UPDATE', userId, updated.projectId, 'Payment', id, `Updated payment ${updated.code}`, oldPayment, updated);
    return updated;
  }

  completePayment(id: number, userId?: number) {
    return this.changePaymentStatus(id, 'COMPLETED', userId, 'Completed');
  }

  cancelPayment(id: number, userId?: number) {
    return this.changePaymentStatus(id, 'CANCELLED', userId, 'Cancelled');
  }

  async removePayment(id: number, userId?: number) {
    const oldPayment = await this.findPayment(id);

    if (oldPayment.status === 'COMPLETED') {
      throw new BadRequestException('Completed payment cannot be deleted. Cancel it instead.');
    }

    const deleted = await this.db.payment.delete({ where: { id } });
    if (oldPayment.invoiceId) await this.updateInvoicePaymentStatus(oldPayment.invoiceId);

    await this.audit('DELETE', userId, oldPayment.projectId, 'Payment', id, `Deleted payment ${oldPayment.code}`, oldPayment, deleted);
    return deleted;
  }

  async updateInvoicePaymentStatus(invoiceId: number) {
    const invoice = await this.db.invoice.findUnique({
      where: { id: invoiceId },
      include: { payments: true },
    });

    if (!invoice || invoice.status === 'CANCELLED') return;

    const paidAmount = invoice.payments
      .filter((payment: any) => payment.status === 'COMPLETED')
      .reduce((sum: number, payment: any) => sum + Number(payment.amount), 0);

    const totalAmount = Number(invoice.totalAmount);
    let status = invoice.status;

    if (paidAmount <= 0) status = invoice.status === 'SENT' ? 'SENT' : 'DRAFT';
    else if (paidAmount < totalAmount) status = 'PARTIALLY_PAID';
    else status = 'PAID';

    await this.db.invoice.update({ where: { id: invoiceId }, data: { status } });
  }

  async getCashFlow(projectId: number) {
    await this.ensureProject(projectId);

    const [invoices, payments, expenses] = await Promise.all([
      this.db.invoice.findMany({ where: { projectId } }),
      this.db.payment.findMany({ where: { projectId } }),
      this.db.expense.findMany({ where: { projectId } }),
    ]);

    const invoicedAmount = this.sum(invoices, 'totalAmount');
    const receivedAmount = payments
      .filter((item: any) => item.status === 'COMPLETED')
      .reduce((sum: number, item: any) => sum + Number(item.amount), 0);
    const expenseAmount = this.sum(expenses, 'amount');
    const retentionHeld = this.sum(invoices, 'retentionAmount');
    const advanceDeducted = this.sum(invoices, 'advanceDeduction');

    return {
      projectId,
      invoicedAmount,
      receivedAmount,
      expenseAmount,
      retentionHeld,
      advanceDeducted,
      netCashFlow: receivedAmount - expenseAmount,
      outstandingReceivable: invoicedAmount - receivedAmount,
    };
  }

  private async changeInvoiceStatus(id: number, status: string, userId?: number, label?: string) {
    const oldInvoice = await this.findInvoice(id);

    if (oldInvoice.status === 'PAID') throw new BadRequestException('Paid invoice cannot be changed');

    const updated = await this.db.invoice.update({
      where: { id },
      data: { status: this.normalizeInvoiceStatus(status) },
      include: this.invoiceInclude(),
    });

    await this.audit('UPDATE', userId, updated.projectId, 'Invoice', id, `${label} invoice ${updated.code}`, oldInvoice, updated);
    return updated;
  }

  private async changePaymentStatus(id: number, status: string, userId?: number, label?: string) {
    const oldPayment = await this.findPayment(id);

    if (oldPayment.status === 'CANCELLED') throw new BadRequestException('Cancelled payment cannot be changed');

    const updated = await this.db.payment.update({
      where: { id },
      data: { status: this.normalizePaymentStatus(status) },
      include: this.paymentInclude(),
    });

    if (updated.invoiceId) await this.updateInvoicePaymentStatus(updated.invoiceId);

    await this.audit('UPDATE', userId, updated.projectId, 'Payment', id, `${label} payment ${updated.code}`, oldPayment, updated);
    return updated;
  }

  private async ensureProject(projectId: number) {
    if (!projectId) throw new BadRequestException('Project is required');
    const project = await this.db.project.findUnique({ where: { id: projectId }, select: { id: true } });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  private async ensureInvoice(invoiceId?: number | null) {
    if (!invoiceId) return null;
    const invoice = await this.db.invoice.findUnique({ where: { id: Number(invoiceId) } });
    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }

  private async ensureUnique(model: string, projectId: number, code: string, excludeId?: number) {
    const duplicate = await this.db[model].findFirst({
      where: { projectId, code, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
      select: { id: true },
    });
    if (duplicate) throw new BadRequestException(`${code} already exists for this project`);
  }

  private calculateInvoiceTotal(dto: { subtotal?: number; taxAmount?: number; retentionAmount?: number; advanceDeduction?: number }) {
    return Number(dto.subtotal ?? 0) + Number(dto.taxAmount ?? 0) - Number(dto.retentionAmount ?? 0) - Number(dto.advanceDeduction ?? 0);
  }

  private normalizeInvoiceStatus(status: string) {
    const value = String(status || '').trim().toUpperCase();
    if (!invoiceStatuses.includes(value)) throw new BadRequestException('Invalid invoice status');
    return value;
  }

  private normalizePaymentStatus(status: string) {
    const value = String(status || '').trim().toUpperCase();
    if (!paymentStatuses.includes(value)) throw new BadRequestException('Invalid payment status');
    return value;
  }

  private normalizePaymentType(type: string) {
    const value = String(type || '').trim().toUpperCase();
    if (!paymentTypes.includes(value)) throw new BadRequestException('Invalid payment type');
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
    return items.reduce((sum, item) => sum + Number(item[field] || 0), 0);
  }

  private invoiceInclude() {
    return {
      project: { select: { id: true, code: true, name: true } },
      payments: true,
    };
  }

  private paymentInclude() {
    return {
      project: { select: { id: true, code: true, name: true } },
      invoice: { select: { id: true, code: true, title: true, totalAmount: true, status: true } },
    };
  }

  private async audit(action: keyof typeof AuditAction | string, userId: number | undefined, projectId: number, entityName: string, entityId: number, description: string, oldData?: any, newData?: any) {
    await this.auditService.create({
      userId,
      projectId,
      action: (AuditAction as any)[action] ?? AuditAction.UPDATE,
      module: 'finance',
      entityName,
      entityId: String(entityId),
      description,
      oldData,
      newData,
    });
  }
}