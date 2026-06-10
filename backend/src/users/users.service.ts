import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.user.findMany({
      orderBy: { id: 'asc' },
      select: this.userListSelect(),
    });
  }

  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        ...this.userListSelect(),
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

  async create(dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException('Email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    return this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        passwordHash,
        phone: dto.phone,
        jobTitle: dto.jobTitle,
        employeeId: dto.employeeId,
        department: dto.department,
        employmentType: dto.employmentType,
        gender: dto.gender,
        nationality: dto.nationality,
        address: dto.address,
        emergencyName: dto.emergencyName,
        emergencyPhone: dto.emergencyPhone,
        educationLevel: dto.educationLevel,
        fieldOfStudy: dto.fieldOfStudy,
        institution: dto.institution,
        graduationYear: dto.graduationYear,
        yearsExperience: dto.yearsExperience,
        previousCompany: dto.previousCompany,
        status: 'ACTIVE',
      },
      select: this.userListSelect(),
    });
  }

  async update(id: number, dto: UpdateUserDto) {
    await this.findOne(id);

    return this.prisma.user.update({
      where: { id },
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        jobTitle: dto.jobTitle,
        status: dto.status as any,
      },
      select: this.userListSelect(),
    });
  }

  async remove(id: number) {
    await this.findOne(id);

    return this.prisma.user.update({
      where: { id },
      data: {
        status: 'INACTIVE' as any,
      },
      select: this.userListSelect(),
    });
  }

  async delete(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        companyUsers: true,
        projectUsers: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.status !== 'INACTIVE') {
      throw new BadRequestException(
        'User must be inactive before permanent deletion',
      );
    }

    if (user.companyUsers.length > 0 || user.projectUsers.length > 0) {
      throw new BadRequestException(
        'Cannot delete user assigned to companies or projects',
      );
    }

    return this.prisma.user.delete({
      where: { id },
      select: this.userListSelect(),
    });
  }

  private userListSelect() {
    return {
      id: true,
      name: true,
      email: true,
      phone: true,
      jobTitle: true,
      status: true,
      avatarUrl: true,
      employeeId: true,
      department: true,
      employmentType: true,
      createdAt: true,
      updatedAt: true,
    };
  }
}