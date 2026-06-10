import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction, Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInventoryTransactionDto } from './dto/create-inventory-transaction.dto';
import { CreateMaterialDto } from './dto/create-material.dto';
import { UpdateInventoryTransactionDto } from './dto/update-inventory-transaction.dto';
import { UpdateMaterialDto } from './dto/update-material.dto';

const transactionTypes = ['RECEIVE', 'ISSUE', 'RETURN', 'ADJUSTMENT'];

@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async createMaterial(dto: CreateMaterialDto, userId?: number) {
    const companyId = Number(dto.companyId);
    await this.ensureCompany(companyId);

    const code = this.requiredText(dto.code, 'Material code').toUpperCase();

    const duplicate = await this.prisma.material.findFirst({
      where: { companyId, code },
      select: { id: true },
    });

    if (duplicate) {
      throw new BadRequestException('Material code already exists for this company');
    }

    const material = await this.prisma.material.create({
      data: {
        companyId,
        code,
        name: this.requiredText(dto.name, 'Material name'),
        unit: this.requiredText(dto.unit, 'Unit'),
        description: this.nullIfEmpty(dto.description),
        minStock: dto.minStock ?? null,
      },
      include: this.materialInclude(),
    });

    await this.auditService.create({
      userId,
      action: AuditAction.CREATE,
      module: 'inventory',
      entityName: 'Material',
      entityId: String(material.id),
      description: `Created material ${material.code} - ${material.name}`,
      newData: material,
    });

    return material;
  }

  async findMaterials(companyId: number) {
    await this.ensureCompany(companyId);

    return this.prisma.material.findMany({
      where: { companyId },
      include: this.materialInclude(),
      orderBy: [{ name: 'asc' }],
    });
  }

  async findMaterial(id: number) {
    const material = await this.prisma.material.findUnique({
      where: { id },
      include: this.materialInclude(),
    });

    if (!material) {
      throw new NotFoundException('Material not found');
    }

    return material;
  }

  async updateMaterial(id: number, dto: UpdateMaterialDto, userId?: number) {
    const oldMaterial = await this.findMaterial(id);
    const companyId = dto.companyId ? Number(dto.companyId) : oldMaterial.companyId;

    if (dto.companyId) await this.ensureCompany(companyId);

    const nextCode = dto.code
      ? this.requiredText(dto.code, 'Material code').toUpperCase()
      : oldMaterial.code;

    if (dto.code || dto.companyId) {
      const duplicate = await this.prisma.material.findFirst({
        where: { companyId, code: nextCode, NOT: { id } },
        select: { id: true },
      });

      if (duplicate) {
        throw new BadRequestException('Material code already exists for this company');
      }
    }

    const updated = await this.prisma.material.update({
      where: { id },
      data: {
        companyId: dto.companyId ? companyId : undefined,
        code: dto.code !== undefined ? nextCode : undefined,
        name: dto.name !== undefined ? this.requiredText(dto.name, 'Material name') : undefined,
        unit: dto.unit !== undefined ? this.requiredText(dto.unit, 'Unit') : undefined,
        description: dto.description !== undefined ? this.nullIfEmpty(dto.description) : undefined,
        minStock: dto.minStock,
      },
      include: this.materialInclude(),
    });

    await this.auditService.create({
      userId,
      action: AuditAction.UPDATE,
      module: 'inventory',
      entityName: 'Material',
      entityId: String(id),
      description: `Updated material ${updated.code} - ${updated.name}`,
      oldData: oldMaterial,
      newData: updated,
    });

    return updated;
  }

  async removeMaterial(id: number, userId?: number) {
    const oldMaterial = await this.findMaterial(id);

    const txCount = await this.prisma.inventoryTransaction.count({ where: { materialId: id } });
    if (txCount > 0) {
      throw new BadRequestException('Material with transactions cannot be deleted');
    }

    const deleted = await this.prisma.material.delete({ where: { id } });

    await this.auditService.create({
      userId,
      action: AuditAction.DELETE,
      module: 'inventory',
      entityName: 'Material',
      entityId: String(id),
      description: `Deleted material ${oldMaterial.code} - ${oldMaterial.name}`,
      oldData: oldMaterial,
      newData: deleted,
    });

    return deleted;
  }

  async createTransaction(dto: CreateInventoryTransactionDto, userId?: number) {
    const projectId = Number(dto.projectId);
    const materialId = Number(dto.materialId);

    await this.ensureProject(projectId);
    const material = await this.ensureMaterial(materialId);

    const type = this.normalizeTransactionType(dto.type);
    const quantity = Number(dto.quantity);

    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new BadRequestException('Quantity must be greater than zero');
    }

    if (dto.unit && dto.unit !== material.unit) {
      throw new BadRequestException(`Transaction unit must match material unit: ${material.unit}`);
    }

    const transaction = await this.prisma.inventoryTransaction.create({
      data: {
        projectId,
        materialId,
        type,
        quantity,
        unit: material.unit,
        reference: this.nullIfEmpty(dto.reference),
        notes: this.nullIfEmpty(dto.notes),
        performedById: userId ?? null,
      },
      include: this.transactionInclude(),
    });

    await this.auditService.create({
      userId,
      projectId: transaction.projectId,
      action: AuditAction.CREATE,
      module: 'inventory',
      entityName: 'InventoryTransaction',
      entityId: String(transaction.id),
      description: `${transaction.type} material ${transaction.material.code}`,
      newData: transaction,
    });

    return transaction;
  }

  async findTransaction(id: number) {
    const transaction = await this.prisma.inventoryTransaction.findUnique({
      where: { id },
      include: this.transactionInclude(),
    });

    if (!transaction) throw new NotFoundException('Inventory transaction not found');
    return transaction;
  }

  async findTransactionsByProject(projectId: number) {
    await this.ensureProject(projectId);

    return this.prisma.inventoryTransaction.findMany({
      where: { projectId },
      include: this.transactionInclude(),
      orderBy: { createdAt: 'desc' },
    });
  }

  async findTransactionsByMaterial(materialId: number) {
    await this.ensureMaterial(materialId);

    return this.prisma.inventoryTransaction.findMany({
      where: { materialId },
      include: this.transactionInclude(),
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateTransaction(id: number, dto: UpdateInventoryTransactionDto, userId?: number) {
    const oldTransaction = await this.findTransaction(id);
    const projectId = dto.projectId ? Number(dto.projectId) : oldTransaction.projectId;
    const materialId = dto.materialId ? Number(dto.materialId) : oldTransaction.materialId;

    if (dto.projectId) await this.ensureProject(projectId);
    const material = await this.ensureMaterial(materialId);

    const quantity = dto.quantity !== undefined ? Number(dto.quantity) : undefined;
    if (quantity !== undefined && (!Number.isFinite(quantity) || quantity <= 0)) {
      throw new BadRequestException('Quantity must be greater than zero');
    }

    if (dto.unit && dto.unit !== material.unit) {
      throw new BadRequestException(`Transaction unit must match material unit: ${material.unit}`);
    }

    const updated = await this.prisma.inventoryTransaction.update({
      where: { id },
      data: {
        projectId: dto.projectId ? projectId : undefined,
        materialId: dto.materialId ? materialId : undefined,
        type: dto.type !== undefined ? this.normalizeTransactionType(dto.type) : undefined,
        quantity,
        unit: dto.materialId ? material.unit : undefined,
        reference: dto.reference !== undefined ? this.nullIfEmpty(dto.reference) : undefined,
        notes: dto.notes !== undefined ? this.nullIfEmpty(dto.notes) : undefined,
      },
      include: this.transactionInclude(),
    });

    await this.auditService.create({
      userId,
      projectId: updated.projectId,
      action: AuditAction.UPDATE,
      module: 'inventory',
      entityName: 'InventoryTransaction',
      entityId: String(id),
      description: `Updated inventory transaction ${updated.id}`,
      oldData: oldTransaction,
      newData: updated,
    });

    return updated;
  }

  async removeTransaction(id: number, userId?: number) {
    const oldTransaction = await this.findTransaction(id);
    const deleted = await this.prisma.inventoryTransaction.delete({ where: { id } });

    await this.auditService.create({
      userId,
      projectId: oldTransaction.projectId,
      action: AuditAction.DELETE,
      module: 'inventory',
      entityName: 'InventoryTransaction',
      entityId: String(id),
      description: `Deleted inventory transaction ${oldTransaction.id}`,
      oldData: oldTransaction,
      newData: deleted,
    });

    return deleted;
  }

  async getProjectStock(projectId: number) {
    await this.ensureProject(projectId);

    const transactions = await this.prisma.inventoryTransaction.findMany({
      where: { projectId },
      include: { material: true },
    });

    const stockMap = new Map<number, any>();

    for (const tx of transactions) {
      if (!stockMap.has(tx.materialId)) {
        stockMap.set(tx.materialId, {
          materialId: tx.materialId,
          code: tx.material.code,
          name: tx.material.name,
          unit: tx.material.unit,
          minStock: tx.material.minStock,
          received: 0,
          issued: 0,
          returned: 0,
          adjusted: 0,
          balance: 0,
        });
      }

      const stock = stockMap.get(tx.materialId);
      const quantity = Number(tx.quantity);

      if (tx.type === 'RECEIVE') {
        stock.received += quantity;
        stock.balance += quantity;
      }

      if (tx.type === 'ISSUE') {
        stock.issued += quantity;
        stock.balance -= quantity;
      }

      if (tx.type === 'RETURN') {
        stock.returned += quantity;
        stock.balance += quantity;
      }

      if (tx.type === 'ADJUSTMENT') {
        stock.adjusted += quantity;
        stock.balance += quantity;
      }
    }

    return Array.from(stockMap.values()).map((item) => ({
      ...item,
      isLowStock:
        item.minStock !== null && item.minStock !== undefined
          ? item.balance <= Number(item.minStock)
          : false,
    }));
  }

  private materialInclude(): Prisma.MaterialInclude {
    return {
      company: { select: { id: true, name: true } },
    };
  }

  private transactionInclude(): Prisma.InventoryTransactionInclude {
    return {
      project: { select: { id: true, code: true, name: true } },
      material: true,
      performedBy: { select: { id: true, name: true, email: true, jobTitle: true } },
    };
  }

  private async ensureCompany(companyId: number) {
    if (!companyId) throw new BadRequestException('Company is required');

    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true },
    });

    if (!company) throw new NotFoundException('Company not found');
  }

  private async ensureProject(projectId: number) {
    if (!projectId) throw new BadRequestException('Project is required');

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true },
    });

    if (!project) throw new NotFoundException('Project not found');
  }

  private async ensureMaterial(materialId: number) {
    if (!materialId) throw new BadRequestException('Material is required');

    const material = await this.prisma.material.findUnique({
      where: { id: materialId },
      select: { id: true, code: true, name: true, unit: true },
    });

    if (!material) throw new NotFoundException('Material not found');
    return material;
  }

  private normalizeTransactionType(type: string) {
    const value = String(type || '').trim().toUpperCase();

    if (!transactionTypes.includes(value)) {
      throw new BadRequestException('Invalid inventory transaction type');
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
