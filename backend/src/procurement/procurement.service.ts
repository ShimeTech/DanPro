import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction, Prisma, ProcurementStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { CreatePurchaseRequestDto } from './dto/create-purchase-request.dto';
import { UpdatePurchaseRequestDto } from './dto/update-purchase-request.dto';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';

@Injectable()
export class ProcurementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  // =========================================================
  // SUPPLIERS
  // =========================================================

  async createSupplier(dto: CreateSupplierDto, userId?: number) {
    const companyId = Number(dto.companyId);
    await this.ensureCompany(companyId);

    const existing = await this.prisma.supplier.findFirst({
      where: {
        companyId,
        name: this.requiredText(dto.name, 'Supplier name'),
      },
      select: { id: true },
    });

    if (existing) {
      throw new BadRequestException('Supplier already exists for this company');
    }

    const supplier = await this.prisma.supplier.create({
      data: {
        companyId,
        name: this.requiredText(dto.name, 'Supplier name'),
        email: this.nullIfEmpty(dto.email),
        phone: this.nullIfEmpty(dto.phone),
        address: this.nullIfEmpty(dto.address),
        taxNumber: this.nullIfEmpty(dto.taxNumber),
        isActive: dto.isActive ?? true,
      },
      include: this.supplierInclude(),
    });

    await this.auditService.create({
      userId,
      action: AuditAction.CREATE,
      module: 'procurement',
      entityName: 'Supplier',
      entityId: String(supplier.id),
      description: `Created supplier ${supplier.name}`,
      newData: supplier,
    });

    return supplier;
  }

  async findSuppliers(companyId: number) {
    await this.ensureCompany(companyId);

    return this.prisma.supplier.findMany({
      where: { companyId },
      include: this.supplierInclude(),
      orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async findSupplier(id: number) {
    const supplier = await this.prisma.supplier.findUnique({
      where: { id },
      include: this.supplierInclude(),
    });

    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }

    return supplier;
  }

  async updateSupplier(id: number, dto: UpdateSupplierDto, userId?: number) {
    const oldSupplier = await this.findSupplier(id);
    const companyId = dto.companyId
      ? Number(dto.companyId)
      : oldSupplier.companyId;

    if (dto.companyId) {
      await this.ensureCompany(companyId);
    }

    const updated = await this.prisma.supplier.update({
      where: { id },
      data: {
        companyId: dto.companyId ? companyId : undefined,
        name:
          dto.name !== undefined
            ? this.requiredText(dto.name, 'Supplier name')
            : undefined,
        email: dto.email !== undefined ? this.nullIfEmpty(dto.email) : undefined,
        phone: dto.phone !== undefined ? this.nullIfEmpty(dto.phone) : undefined,
        address:
          dto.address !== undefined ? this.nullIfEmpty(dto.address) : undefined,
        taxNumber:
          dto.taxNumber !== undefined ? this.nullIfEmpty(dto.taxNumber) : undefined,
        isActive: dto.isActive,
      },
      include: this.supplierInclude(),
    });

    await this.auditService.create({
      userId,
      action: AuditAction.UPDATE,
      module: 'procurement',
      entityName: 'Supplier',
      entityId: String(id),
      description: `Updated supplier ${updated.name}`,
      oldData: oldSupplier,
      newData: updated,
    });

    return updated;
  }

  async activateSupplier(id: number, userId?: number) {
    return this.setSupplierActiveState(id, true, userId);
  }

  async deactivateSupplier(id: number, userId?: number) {
    return this.setSupplierActiveState(id, false, userId);
  }

  async removeSupplier(id: number, userId?: number) {
    const oldSupplier = await this.findSupplier(id);

    const poCount = await this.prisma.purchaseOrder.count({
      where: { supplierId: id },
    });

    if (poCount > 0) {
      throw new BadRequestException(
        'Supplier with purchase orders cannot be deleted. Deactivate it instead.',
      );
    }

    const deleted = await this.prisma.supplier.delete({
      where: { id },
    });

    await this.auditService.create({
      userId,
      action: AuditAction.DELETE,
      module: 'procurement',
      entityName: 'Supplier',
      entityId: String(id),
      description: `Deleted supplier ${oldSupplier.name}`,
      oldData: oldSupplier,
      newData: deleted,
    });

    return deleted;
  }

  // =========================================================
  // PURCHASE REQUESTS
  // =========================================================

  async createPurchaseRequest(dto: CreatePurchaseRequestDto, userId?: number) {
    const projectId = Number(dto.projectId);
    await this.ensureProject(projectId);

    const code = this.requiredText(dto.code, 'PR code').toUpperCase();

    await this.ensureUniquePurchaseRequestCode(projectId, code);
    await this.ensureMaterials(dto.items);

    const request = await this.prisma.purchaseRequest.create({
      data: {
        projectId,
        code,
        description: this.nullIfEmpty(dto.description),
        status: this.normalizeStatus(dto.status ?? ProcurementStatus.DRAFT),
        requestedById: userId ?? null,
        requestedDate: dto.requestedDate
          ? this.normalizeDate(dto.requestedDate)
          : new Date(),
        items: dto.items?.length
          ? {
              create: dto.items.map((item) => ({
                materialId: item.materialId ?? null,
                description: this.requiredText(
                  item.description,
                  'Item description',
                ),
                quantity: Number(item.quantity),
                unit: this.requiredText(item.unit, 'Unit'),
              })),
            }
          : undefined,
      },
      include: this.purchaseRequestInclude(),
    });

    await this.auditService.create({
      userId,
      projectId: request.projectId,
      action: AuditAction.CREATE,
      module: 'procurement',
      entityName: 'PurchaseRequest',
      entityId: String(request.id),
      description: `Created purchase request ${request.code}`,
      newData: request,
    });

    return request;
  }

  async findPurchaseRequests(projectId: number) {
    await this.ensureProject(projectId);

    return this.prisma.purchaseRequest.findMany({
      where: { projectId },
      include: this.purchaseRequestInclude(),
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async findPurchaseRequest(id: number) {
    const request = await this.prisma.purchaseRequest.findUnique({
      where: { id },
      include: this.purchaseRequestInclude(),
    });

    if (!request) {
      throw new NotFoundException('Purchase request not found');
    }

    return request;
  }

  async updatePurchaseRequest(
    id: number,
    dto: UpdatePurchaseRequestDto,
    userId?: number,
  ) {
    const oldRequest = await this.findPurchaseRequest(id);

    if (
      oldRequest.status === ProcurementStatus.APPROVED ||
      oldRequest.status === ProcurementStatus.REJECTED ||
      oldRequest.status === ProcurementStatus.RECEIVED ||
      oldRequest.status === ProcurementStatus.CANCELLED
    ) {
      throw new BadRequestException('Finalized purchase request cannot be edited');
    }

    const projectId = dto.projectId
      ? Number(dto.projectId)
      : oldRequest.projectId;

    if (dto.projectId) {
      await this.ensureProject(projectId);
    }

    const nextCode = dto.code
      ? this.requiredText(dto.code, 'PR code').toUpperCase()
      : oldRequest.code;

    if (dto.code || dto.projectId) {
      await this.ensureUniquePurchaseRequestCode(projectId, nextCode, id);
    }

    const updated = await this.prisma.purchaseRequest.update({
      where: { id },
      data: {
        projectId: dto.projectId ? projectId : undefined,
        code: dto.code !== undefined ? nextCode : undefined,
        description:
          dto.description !== undefined
            ? this.nullIfEmpty(dto.description)
            : undefined,
        status:
          dto.status !== undefined ? this.normalizeStatus(dto.status) : undefined,
        requestedDate:
          dto.requestedDate !== undefined
            ? dto.requestedDate
              ? this.normalizeDate(dto.requestedDate)
              : null
            : undefined,
      },
      include: this.purchaseRequestInclude(),
    });

    await this.auditService.create({
      userId,
      projectId: updated.projectId,
      action: AuditAction.UPDATE,
      module: 'procurement',
      entityName: 'PurchaseRequest',
      entityId: String(id),
      description: `Updated purchase request ${updated.code}`,
      oldData: oldRequest,
      newData: updated,
    });

    return updated;
  }

  async submitPurchaseRequest(id: number, userId?: number) {
    return this.changePurchaseRequestStatus(
      id,
      ProcurementStatus.SUBMITTED,
      userId,
      'Submitted',
    );
  }

  async approvePurchaseRequest(id: number, userId?: number) {
    return this.changePurchaseRequestStatus(
      id,
      ProcurementStatus.APPROVED,
      userId,
      'Approved',
    );
  }

  async rejectPurchaseRequest(id: number, userId?: number) {
    return this.changePurchaseRequestStatus(
      id,
      ProcurementStatus.REJECTED,
      userId,
      'Rejected',
    );
  }

  async cancelPurchaseRequest(id: number, userId?: number) {
    return this.changePurchaseRequestStatus(
      id,
      ProcurementStatus.CANCELLED,
      userId,
      'Cancelled',
    );
  }

  async removePurchaseRequest(id: number, userId?: number) {
    const oldRequest = await this.findPurchaseRequest(id);

    if (oldRequest.status === ProcurementStatus.APPROVED) {
      throw new BadRequestException('Approved purchase request cannot be deleted');
    }

    await this.prisma.purchaseRequestItem.deleteMany({
      where: { purchaseRequestId: id },
    });

    const deleted = await this.prisma.purchaseRequest.delete({
      where: { id },
    });

    await this.auditService.create({
      userId,
      projectId: oldRequest.projectId,
      action: AuditAction.DELETE,
      module: 'procurement',
      entityName: 'PurchaseRequest',
      entityId: String(id),
      description: `Deleted purchase request ${oldRequest.code}`,
      oldData: oldRequest,
      newData: deleted,
    });

    return deleted;
  }

  // =========================================================
  // PURCHASE ORDERS
  // =========================================================

  async createPurchaseOrder(dto: CreatePurchaseOrderDto, userId?: number) {
    const projectId = Number(dto.projectId);

    await this.ensureProject(projectId);
    await this.ensureSupplier(dto.supplierId);
    await this.ensureMaterials(dto.items);

    const code = this.requiredText(dto.code, 'PO code').toUpperCase();

    await this.ensureUniquePurchaseOrderCode(projectId, code);

    const items = dto.items ?? [];
    const calculatedTotal = this.calculateItemsTotal(items);

    const order = await this.prisma.purchaseOrder.create({
      data: {
        projectId,
        supplierId: dto.supplierId ?? null,
        code,
        description: this.nullIfEmpty(dto.description),
        status: this.normalizeStatus(dto.status ?? ProcurementStatus.DRAFT),
        orderDate: dto.orderDate
          ? this.normalizeDate(dto.orderDate)
          : new Date(),
        totalAmount: dto.totalAmount ?? calculatedTotal,
        createdById: userId ?? null,
        items: items.length
          ? {
              create: items.map((item) => {
                const quantity = Number(item.quantity);
                const unitPrice =
                  item.unitPrice !== undefined && item.unitPrice !== null
                    ? Number(item.unitPrice)
                    : null;

                return {
                  materialId: item.materialId ?? null,
                  description: this.requiredText(
                    item.description,
                    'Item description',
                  ),
                  quantity,
                  unit: this.requiredText(item.unit, 'Unit'),
                  unitPrice,
                  totalPrice:
                    item.totalPrice ??
                    (unitPrice !== null ? quantity * unitPrice : null),
                };
              }),
            }
          : undefined,
      },
      include: this.purchaseOrderInclude(),
    });

    await this.auditService.create({
      userId,
      projectId: order.projectId,
      action: AuditAction.CREATE,
      module: 'procurement',
      entityName: 'PurchaseOrder',
      entityId: String(order.id),
      description: `Created purchase order ${order.code}`,
      newData: order,
    });

    return order;
  }

  async findPurchaseOrders(projectId: number) {
    await this.ensureProject(projectId);

    return this.prisma.purchaseOrder.findMany({
      where: { projectId },
      include: this.purchaseOrderInclude(),
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async findPurchaseOrder(id: number) {
    const order = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: this.purchaseOrderInclude(),
    });

    if (!order) {
      throw new NotFoundException('Purchase order not found');
    }

    return order;
  }

  async updatePurchaseOrder(
    id: number,
    dto: UpdatePurchaseOrderDto,
    userId?: number,
  ) {
    const oldOrder = await this.findPurchaseOrder(id);

    if (
      oldOrder.status === ProcurementStatus.RECEIVED ||
      oldOrder.status === ProcurementStatus.CANCELLED
    ) {
      throw new BadRequestException(
        'Received or cancelled purchase order cannot be edited',
      );
    }

    const projectId = dto.projectId
      ? Number(dto.projectId)
      : oldOrder.projectId;

    if (dto.projectId) {
      await this.ensureProject(projectId);
    }

    if (dto.supplierId) {
      await this.ensureSupplier(dto.supplierId);
    }

    const nextCode = dto.code
      ? this.requiredText(dto.code, 'PO code').toUpperCase()
      : oldOrder.code;

    if (dto.code || dto.projectId) {
      await this.ensureUniquePurchaseOrderCode(projectId, nextCode, id);
    }

    const updated = await this.prisma.purchaseOrder.update({
      where: { id },
      data: {
        projectId: dto.projectId ? projectId : undefined,
        supplierId:
          dto.supplierId !== undefined
            ? dto.supplierId
              ? Number(dto.supplierId)
              : null
            : undefined,
        code: dto.code !== undefined ? nextCode : undefined,
        description:
          dto.description !== undefined
            ? this.nullIfEmpty(dto.description)
            : undefined,
        status:
          dto.status !== undefined ? this.normalizeStatus(dto.status) : undefined,
        orderDate:
          dto.orderDate !== undefined
            ? dto.orderDate
              ? this.normalizeDate(dto.orderDate)
              : null
            : undefined,
        totalAmount: dto.totalAmount,
      },
      include: this.purchaseOrderInclude(),
    });

    await this.auditService.create({
      userId,
      projectId: updated.projectId,
      action: AuditAction.UPDATE,
      module: 'procurement',
      entityName: 'PurchaseOrder',
      entityId: String(id),
      description: `Updated purchase order ${updated.code}`,
      oldData: oldOrder,
      newData: updated,
    });

    return updated;
  }

  async issuePurchaseOrder(id: number, userId?: number) {
    return this.changePurchaseOrderStatus(
      id,
      ProcurementStatus.ORDERED,
      userId,
      'Ordered',
    );
  }

  async closePurchaseOrder(id: number, userId?: number) {
    return this.changePurchaseOrderStatus(
      id,
      ProcurementStatus.RECEIVED,
      userId,
      'Received',
    );
  }

  async cancelPurchaseOrder(id: number, userId?: number) {
    return this.changePurchaseOrderStatus(
      id,
      ProcurementStatus.CANCELLED,
      userId,
      'Cancelled',
    );
  }

  async removePurchaseOrder(id: number, userId?: number) {
    const oldOrder = await this.findPurchaseOrder(id);

    if (
      oldOrder.status === ProcurementStatus.ORDERED ||
      oldOrder.status === ProcurementStatus.RECEIVED
    ) {
      throw new BadRequestException(
        'Ordered or received purchase order cannot be deleted',
      );
    }

    await this.prisma.purchaseOrderItem.deleteMany({
      where: { purchaseOrderId: id },
    });

    const deleted = await this.prisma.purchaseOrder.delete({
      where: { id },
    });

    await this.auditService.create({
      userId,
      projectId: oldOrder.projectId,
      action: AuditAction.DELETE,
      module: 'procurement',
      entityName: 'PurchaseOrder',
      entityId: String(id),
      description: `Deleted purchase order ${oldOrder.code}`,
      oldData: oldOrder,
      newData: deleted,
    });

    return deleted;
  }

  // =========================================================
  // PRIVATE HELPERS
  // =========================================================

  private async setSupplierActiveState(
    id: number,
    isActive: boolean,
    userId?: number,
  ) {
    const oldSupplier = await this.findSupplier(id);

    const updated = await this.prisma.supplier.update({
      where: { id },
      data: { isActive },
      include: this.supplierInclude(),
    });

    await this.auditService.create({
      userId,
      action: AuditAction.UPDATE,
      module: 'procurement',
      entityName: 'Supplier',
      entityId: String(id),
      description: `${isActive ? 'Activated' : 'Deactivated'} supplier ${
        updated.name
      }`,
      oldData: oldSupplier,
      newData: updated,
    });

    return updated;
  }

  private async changePurchaseRequestStatus(
    id: number,
    status: ProcurementStatus,
    userId: number | undefined,
    label: string,
  ) {
    const oldRequest = await this.findPurchaseRequest(id);

    if (
      oldRequest.status === ProcurementStatus.RECEIVED ||
      oldRequest.status === ProcurementStatus.CANCELLED
    ) {
      throw new BadRequestException('Cannot modify finalized purchase request');
    }

    const updated = await this.prisma.purchaseRequest.update({
      where: { id },
      data: { status },
      include: this.purchaseRequestInclude(),
    });

    await this.auditService.create({
      userId,
      projectId: updated.projectId,
      action:
        status === ProcurementStatus.APPROVED
          ? AuditAction.APPROVE
          : status === ProcurementStatus.REJECTED
            ? AuditAction.REJECT
            : AuditAction.UPDATE,
      module: 'procurement',
      entityName: 'PurchaseRequest',
      entityId: String(id),
      description: `${label} purchase request ${updated.code}`,
      oldData: oldRequest,
      newData: updated,
    });

    return updated;
  }

  private async changePurchaseOrderStatus(
    id: number,
    status: ProcurementStatus,
    userId: number | undefined,
    label: string,
  ) {
    const oldOrder = await this.findPurchaseOrder(id);

    if (
      oldOrder.status === ProcurementStatus.RECEIVED ||
      oldOrder.status === ProcurementStatus.CANCELLED
    ) {
      throw new BadRequestException('Purchase order already finalized');
    }

    const updated = await this.prisma.purchaseOrder.update({
      where: { id },
      data: { status },
      include: this.purchaseOrderInclude(),
    });

    await this.auditService.create({
      userId,
      projectId: updated.projectId,
      action: AuditAction.UPDATE,
      module: 'procurement',
      entityName: 'PurchaseOrder',
      entityId: String(id),
      description: `${label} purchase order ${updated.code}`,
      oldData: oldOrder,
      newData: updated,
    });

    return updated;
  }

  private supplierInclude(): Prisma.SupplierInclude {
    return {
      company: {
        select: {
          id: true,
          name: true,
        },
      },
    };
  }

  private purchaseRequestInclude(): Prisma.PurchaseRequestInclude {
    return {
      project: {
        select: {
          id: true,
          code: true,
          name: true,
        },
      },
      requestedBy: {
        select: {
          id: true,
          name: true,
          email: true,
          jobTitle: true,
        },
      },
      items: {
        include: {
          material: true,
        },
      },
    };
  }

  private purchaseOrderInclude(): Prisma.PurchaseOrderInclude {
    return {
      project: {
        select: {
          id: true,
          code: true,
          name: true,
        },
      },
      supplier: true,
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
          jobTitle: true,
        },
      },
      items: {
        include: {
          material: true,
        },
      },
    };
  }

  private async ensureProject(projectId: number) {
    if (!projectId) {
      throw new BadRequestException('Project is required');
    }

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }
  }

  private async ensureCompany(companyId: number) {
    if (!companyId) {
      throw new BadRequestException('Company is required');
    }

    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }
  }

  private async ensureSupplier(supplierId?: number | null) {
    if (!supplierId) return;

    const supplier = await this.prisma.supplier.findUnique({
      where: { id: Number(supplierId) },
      select: {
        id: true,
        isActive: true,
      },
    });

    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }

    if (!supplier.isActive) {
      throw new BadRequestException('Supplier is inactive');
    }
  }

  private async ensureMaterials(items?: Array<{ materialId?: number | null }>) {
    if (!items?.length) return;

    for (const item of items) {
      if (!item.materialId) continue;

      const material = await this.prisma.material.findUnique({
        where: { id: Number(item.materialId) },
        select: { id: true },
      });

      if (!material) {
        throw new NotFoundException('Material not found');
      }
    }
  }

  private async ensureUniquePurchaseRequestCode(
    projectId: number,
    code: string,
    excludeId?: number,
  ) {
    const duplicate = await this.prisma.purchaseRequest.findFirst({
      where: {
        projectId,
        code,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
      select: { id: true },
    });

    if (duplicate) {
      throw new BadRequestException(
        'Purchase request code already exists for this project',
      );
    }
  }

  private async ensureUniquePurchaseOrderCode(
    projectId: number,
    code: string,
    excludeId?: number,
  ) {
    const duplicate = await this.prisma.purchaseOrder.findFirst({
      where: {
        projectId,
        code,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
      select: { id: true },
    });

    if (duplicate) {
      throw new BadRequestException(
        'Purchase order code already exists for this project',
      );
    }
  }

  private normalizeStatus(status: string | ProcurementStatus): ProcurementStatus {
    const value = String(status || '')
      .trim()
      .toUpperCase() as ProcurementStatus;

    if (!Object.values(ProcurementStatus).includes(value)) {
      throw new BadRequestException('Invalid procurement status');
    }

    return value;
  }

  private calculateItemsTotal(
    items: Array<{
      quantity: number;
      unitPrice?: number | string | null;
      totalPrice?: number | string | null;
    }>,
  ) {
    return items.reduce((sum, item) => {
      if (item.totalPrice !== undefined && item.totalPrice !== null) {
        return sum + Number(item.totalPrice);
      }

      if (item.unitPrice !== undefined && item.unitPrice !== null) {
        return sum + Number(item.quantity) * Number(item.unitPrice);
      }

      return sum;
    }, 0);
  }

  private normalizeDate(value: string | Date) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Invalid date');
    }

    date.setHours(0, 0, 0, 0);
    return date;
  }

  private requiredText(value: unknown, label: string) {
    const text = String(value ?? '').trim();

    if (!text) {
      throw new BadRequestException(`${label} is required`);
    }

    return text;
  }

  private nullIfEmpty(value?: string | null) {
    if (value === undefined || value === null) return null;

    const text = String(value).trim();
    return text || null;
  }
}
