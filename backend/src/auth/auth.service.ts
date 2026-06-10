import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new BadRequestException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        passwordHash,
        phone: dto.phone,
        jobTitle: dto.jobTitle,
      },
      select: this.userSelect(),
    });

    const accessToken = await this.signAccessToken(user.id, user.email);

    return {
      message: 'User registered successfully',
      user,
      accessToken,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.status && user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Your account is not active');
    }

    const accessToken = await this.signAccessToken(user.id, user.email);

    return {
      message: 'Login successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        jobTitle: user.jobTitle,
        status: user.status,
      },
      accessToken,
    };
  }

  async getMe(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        ...this.userSelect(),
        avatarUrl: true,
        companyUsers: {
          include: {
            company: true,
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
        },
        projectUsers: {
          include: {
            project: true,
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
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const permissions = new Set<string>();

    for (const companyUser of user.companyUsers) {
      for (const rolePermission of companyUser.role.rolePermissions) {
        const permission = rolePermission.permission;
        permissions.add(`${permission.module}:${permission.action}`);
      }
    }

    for (const projectUser of user.projectUsers) {
      for (const rolePermission of projectUser.role.rolePermissions) {
        const permission = rolePermission.permission;
        permissions.add(`${permission.module}:${permission.action}`);
      }
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      jobTitle: user.jobTitle,
      avatarUrl: user.avatarUrl,
      status: user.status,
      companies: user.companyUsers.map((item) => ({
        id: item.company.id,
        name: item.company.name,
        role: item.role.name,
      })),
      projects: user.projectUsers.map((item) => ({
        id: item.project.id,
        code: item.project.code,
        name: item.project.name,
        role: item.role.name,
      })),
      permissions: Array.from(permissions),
    };
  }

  private async signAccessToken(userId: number, email: string) {
    return this.jwtService.signAsync(
      {
        sub: userId,
        email,
      },
      {
        secret: process.env.JWT_ACCESS_SECRET || 'access_secret_change_later',
        expiresIn: '15m',
      },
    );
  }

  private userSelect() {
    return {
      id: true,
      name: true,
      email: true,
      phone: true,
      jobTitle: true,
      status: true,
      createdAt: true,
    };
  }
}