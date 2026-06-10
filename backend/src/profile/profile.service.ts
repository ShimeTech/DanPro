import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuditAction } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class ProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async getMe(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        jobTitle: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        avatarUrl: true,
        companyUsers: {
          include: {
            company: true,
            role: true,
          },
        },
        projectUsers: {
          include: {
            project: true,
            role: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }
  async updateAvatar(userId: number, filePath: string) {
  const updated = await this.prisma.user.update({
    where: { id: userId },
    data: {
      avatarUrl: filePath,
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      jobTitle: true,
      avatarUrl: true,
      status: true,
      updatedAt: true,
    },
  });

  await this.auditService.create({
    userId,
    action: AuditAction.UPDATE,
    module: 'profile',
    entityName: 'User',
    entityId: String(userId),
    description: 'Updated profile avatar',
    newData: updated,
  });

  return updated;
}

  async updateMe(userId: number, dto: UpdateProfileDto) {
    const oldUser = await this.getMe(userId);

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        name: dto.name,
        phone: dto.phone,
        jobTitle: dto.jobTitle,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        jobTitle: true,
        status: true,
        updatedAt: true,
      },
    });

    await this.auditService.create({
      userId,
      action: AuditAction.UPDATE,
      module: 'profile',
      entityName: 'User',
      entityId: String(userId),
      description: 'Updated profile information',
      oldData: oldUser,
      newData: updated,
    });

    return updated;
  }

  async changePassword(userId: number, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const validPassword = await bcrypt.compare(
      dto.currentPassword,
      user.passwordHash,
    );

    if (!validPassword) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException(
        'New password must be different from current password',
      );
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
      },
    });

    await this.auditService.create({
      userId,
      action: AuditAction.UPDATE,
      module: 'profile',
      entityName: 'User',
      entityId: String(userId),
      description: 'Changed account password',
    });

    return {
      message: 'Password changed successfully',
    };
  }

  async getActivity(userId: number) {
    return this.prisma.auditLog.findMany({
      where: { userId },
      include: {
        project: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50,
    });
  }
}