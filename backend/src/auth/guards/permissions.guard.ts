import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions =
      this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);

    if (!requiredPermissions?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const userId = Number(request.user?.sub);

    if (!userId) {
      throw new ForbiddenException('User not authenticated');
    }

    const [companyAssignments, projectAssignments] = await Promise.all([
      this.prisma.companyUser.findMany({
        where: {
          userId,
          status: 'ACTIVE',
        },
        include: {
          role: {
            include: {
              rolePermissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      }),

      this.prisma.projectUser.findMany({
        where: {
          userId,
          status: 'ACTIVE',
        },
        include: {
          role: {
            include: {
              rolePermissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      }),
    ]);

    const userPermissions = new Set<string>();

    for (const assignment of [...companyAssignments, ...projectAssignments]) {
      for (const rolePermission of assignment.role.rolePermissions) {
        const permission = rolePermission.permission;
        userPermissions.add(`${permission.module}:${permission.action}`);
      }
    }

    const hasPermission = requiredPermissions.every((permission) =>
      userPermissions.has(permission),
    );

    if (!hasPermission) {
      throw new ForbiddenException('You do not have permission');
    }

    return true;
  }
}