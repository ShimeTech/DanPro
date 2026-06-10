import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { AssignCompanyUserDto } from './dto/assign-company-user.dto';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyUserDto } from './dto/update-company-user.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';

@Injectable()
export class CompaniesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async create(dto: CreateCompanyDto, userId?: number) {
    const company = await this.prisma.company.create({
      data: {
        name: dto.name,
        legalName: dto.legalName,
        email: dto.email,
        phone: dto.phone,
        address: dto.address,
        taxNumber: dto.taxNumber,
        currency: dto.currency || 'USD',
        timezone: dto.timezone || 'UTC',
        language: dto.language || 'en',
        isActive: dto.isActive ?? true,
      },
    });

    await this.auditService.create({
      userId,
      action: AuditAction.CREATE,
      module: 'companies',
      entityName: 'Company',
      entityId: String(company.id),
      description: `Created company ${company.name}`,
      newData: company,
    });

    return company;
  }

  findAll() {
    return this.prisma.company.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: number) {
    const company = await this.prisma.company.findUnique({
      where: { id },
      include: {
        projects: true,
        companyUsers: {
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
        },
      },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    return company;
  }

  async update(id: number, dto: UpdateCompanyDto, userId?: number) {
    const oldCompany = await this.findOne(id);

    const updatedCompany = await this.prisma.company.update({
      where: { id },
      data: dto,
    });

    await this.auditService.create({
      userId,
      action: AuditAction.UPDATE,
      module: 'companies',
      entityName: 'Company',
      entityId: String(id),
      description: `Updated company ${updatedCompany.name}`,
      oldData: oldCompany,
      newData: updatedCompany,
    });

    return updatedCompany;
  }

  async remove(id: number, userId?: number) {
    const oldCompany = await this.findOne(id);

    const removedCompany = await this.prisma.company.update({
      where: { id },
      data: {
        isActive: false,
      },
    });

    await this.auditService.create({
      userId,
      action: AuditAction.DELETE,
      module: 'companies',
      entityName: 'Company',
      entityId: String(id),
      description: `Deactivated company ${removedCompany.name}`,
      oldData: oldCompany,
      newData: removedCompany,
    });

    return removedCompany;
  }

  async assignUser(
    companyId: number,
    dto: AssignCompanyUserDto,
    userId?: number,
  ) {
    await this.findOne(companyId);

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

    const assignment = await this.prisma.companyUser.upsert({
      where: {
        companyId_userId: {
          companyId,
          userId: dto.userId,
        },
      },
      update: {
        roleId: dto.roleId,
        status: dto.status,
      },
      create: {
        companyId,
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
        company: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    await this.auditService.create({
      userId,
      action: AuditAction.UPDATE,
      module: 'companies',
      entityName: 'CompanyUser',
      entityId: `${companyId}:${dto.userId}`,
      description: `Assigned user ${dto.userId} to company ${companyId}`,
      newData: assignment,
    });

    return assignment;
  }

  listCompanyUsers(companyId: number) {
    return this.prisma.companyUser.findMany({
      where: { companyId },
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

  async updateCompanyUser(
    companyId: number,
    targetUserId: number,
    dto: UpdateCompanyUserDto,
    userId?: number,
  ) {
    await this.findOne(companyId);

    const existing = await this.prisma.companyUser.findUnique({
      where: {
        companyId_userId: {
          companyId,
          userId: targetUserId,
        },
      },
    });

    if (!existing) {
      throw new NotFoundException('Company user assignment not found');
    }

    if (dto.roleId) {
      const role = await this.prisma.role.findUnique({
        where: { id: dto.roleId },
      });

      if (!role) {
        throw new NotFoundException('Role not found');
      }
    }

    const updated = await this.prisma.companyUser.update({
      where: {
        companyId_userId: {
          companyId,
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
      action: AuditAction.UPDATE,
      module: 'companies',
      entityName: 'CompanyUser',
      entityId: `${companyId}:${targetUserId}`,
      description: `Updated user ${targetUserId} assignment in company ${companyId}`,
      oldData: existing,
      newData: updated,
    });

    return updated;
  }

  async removeCompanyUser(
    companyId: number,
    targetUserId: number,
    userId?: number,
  ) {
    await this.findOne(companyId);

    const existing = await this.prisma.companyUser.findUnique({
      where: {
        companyId_userId: {
          companyId,
          userId: targetUserId,
        },
      },
    });

    if (!existing) {
      throw new NotFoundException('Company user assignment not found');
    }

    const removed = await this.prisma.companyUser.delete({
      where: {
        companyId_userId: {
          companyId,
          userId: targetUserId,
        },
      },
    });

    await this.auditService.create({
      userId,
      action: AuditAction.DELETE,
      module: 'companies',
      entityName: 'CompanyUser',
      entityId: `${companyId}:${targetUserId}`,
      description: `Removed user ${targetUserId} from company ${companyId}`,
      oldData: existing,
      newData: removed,
    });

    return removed;
  }
}