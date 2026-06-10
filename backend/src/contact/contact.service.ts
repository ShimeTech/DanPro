import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { NotFoundException } from '@nestjs/common';

@Injectable()
export class ContactService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateContactDto) {
    return this.prisma.contactInquiry.create({
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone ?? null,
        company: dto.company ?? null,
        subject: dto.subject ?? null,
        message: dto.message,
        status: 'NEW',
        isRead: false,
      },
    });
  }
async remove(id: number, _userId: number) {
  const inquiry = await this.prisma.contactInquiry.findUnique({
    where: { id },
  });

  if (!inquiry) {
    throw new NotFoundException('Contact inquiry not found');
  }

  return this.prisma.contactInquiry.delete({
    where: { id },
  });
}
  findNotifications(_userId: number) {
    return this.prisma.contactInquiry.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  unreadCount(_userId: number) {
    return this.prisma.contactInquiry.count({
      where: {
        isRead: false,
      },
    });
  }

  markAsRead(id: number, _userId: number) {
    return this.prisma.contactInquiry.update({
      where: { id },
      data: {
        isRead: true,
        status: 'READ',
      },
    });
  }
}