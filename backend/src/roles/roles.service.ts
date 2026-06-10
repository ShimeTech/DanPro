import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AssignPermissionDto } from './dto/assign-permission.dto';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  findAllRoles() {
    return this.prisma.role.findMany({
      include: this.roleInclude(),
      orderBy: {
        id: 'asc',
      },
    });
  }

  findAllPermissions() {
    return this.prisma.permission.findMany({
      orderBy: [{ module: 'asc' }, { action: 'asc' }],
    });
  }

  async findOneRole(id: number) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: this.roleInclude(),
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    return role;
  }

  async createRole(dto: CreateRoleDto) {
    const name = dto.name.trim();

    const existing = await this.prisma.role.findUnique({
      where: { name },
    });

    if (existing) {
      throw new BadRequestException('Role name already exists');
    }

    return this.prisma.role.create({
      data: {
        name,
        description: dto.description?.trim() || null,
        isSystem: dto.isSystem ?? false,
      },
      include: this.roleInclude(),
    });
  }

  async updateRole(id: number, dto: UpdateRoleDto) {
    const oldRole = await this.findOneRole(id);

    if (oldRole.isSystem && dto.isSystem === false) {
      throw new BadRequestException('System role cannot be converted to normal role');
    }

    if (dto.name) {
      const name = dto.name.trim();

      const duplicate = await this.prisma.role.findFirst({
        where: {
          name,
          NOT: { id },
        },
      });

      if (duplicate) {
        throw new BadRequestException('Role name already exists');
      }
    }

    return this.prisma.role.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        description:
          dto.description !== undefined
            ? dto.description?.trim() || null
            : undefined,
        isSystem: dto.isSystem,
      },
      include: this.roleInclude(),
    });
  }

  async removeRole(id: number) {
    const role = await this.findOneRole(id);

    if (role.isSystem) {
      throw new BadRequestException('System role cannot be deleted');
    }

    await this.prisma.rolePermission.deleteMany({
      where: { roleId: id },
    });

    return this.prisma.role.delete({
      where: { id },
    });
  }

  async assignPermission(roleId: number, dto: AssignPermissionDto) {
    await this.findOneRole(roleId);
    await this.ensurePermission(dto.permissionId);

    return this.prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId,
          permissionId: dto.permissionId,
        },
      },
      update: {},
      create: {
        roleId,
        permissionId: dto.permissionId,
      },
      include: {
        permission: true,
      },
    });
  }

  async removePermission(roleId: number, permissionId: number) {
    await this.findOneRole(roleId);

    const rolePermission = await this.prisma.rolePermission.findUnique({
      where: {
        roleId_permissionId: {
          roleId,
          permissionId,
        },
      },
    });

    if (!rolePermission) {
      throw new NotFoundException('Role permission not found');
    }

    return this.prisma.rolePermission.delete({
      where: {
        roleId_permissionId: {
          roleId,
          permissionId,
        },
      },
    });
  }

  async syncPermissions(roleId: number, permissionIds: number[]) {
    await this.findOneRole(roleId);

    if (!Array.isArray(permissionIds)) {
      throw new BadRequestException('permissionIds must be an array');
    }

    const cleanPermissionIds = [...new Set(permissionIds.map(Number))].filter(
      Boolean,
    );

    if (cleanPermissionIds.length > 0) {
      const foundPermissions = await this.prisma.permission.findMany({
        where: {
          id: {
            in: cleanPermissionIds,
          },
        },
        select: {
          id: true,
        },
      });

      if (foundPermissions.length !== cleanPermissionIds.length) {
        throw new BadRequestException('One or more permissions are invalid');
      }
    }

    await this.prisma.rolePermission.deleteMany({
      where: { roleId },
    });

    if (cleanPermissionIds.length > 0) {
      await this.prisma.rolePermission.createMany({
        data: cleanPermissionIds.map((permissionId) => ({
          roleId,
          permissionId,
        })),
        skipDuplicates: true,
      });
    }

    return this.findOneRole(roleId);
  }

  private async ensurePermission(permissionId: number) {
    const permission = await this.prisma.permission.findUnique({
      where: { id: permissionId },
    });

    if (!permission) {
      throw new NotFoundException('Permission not found');
    }

    return permission;
  }

  private roleInclude() {
    return {
      rolePermissions: {
        include: {
          permission: true,
        },
        orderBy: {
          permission: {
            module: 'asc',
          },
        } as any,
      },
    };
  }
}