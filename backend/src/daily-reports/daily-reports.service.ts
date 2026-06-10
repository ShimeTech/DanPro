import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDailyReportDto } from './dto/create-daily-report.dto';
import { UpdateDailyReportDto } from './dto/update-daily-report.dto';
import { AuditAction, InventoryTransactionType, ProjectUserStatus } from '@prisma/client';


@Injectable()
export class DailyReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async create(dto: CreateDailyReportDto, userId?: number) {
    const projectId = Number(dto.projectId);

    if (!projectId) { 
      throw new BadRequestException('Project is required');
    }

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, code: true, name: true },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const reportDate = this.normalizeReportDate(dto.reportDate);

    const existing = await this.prisma.dailyReport.findFirst({
      where: {
        projectId,
        reportDate,
      },
      select: { id: true },
    });

    if (existing) {
      throw new BadRequestException(
        'Daily report already exists for this project and date',
      );
    }

    const report = await this.prisma.dailyReport.create({
      data: {
        projectId,
        reportDate,
        weather: this.nullIfEmpty(dto.weather),
        manpowerCount: this.toNonNegativeInt(dto.manpowerCount, 'Manpower count'),
        equipmentUsed: this.nullIfEmpty(dto.equipmentUsed),
        workCompleted: this.nullIfEmpty(dto.workCompleted),
        materialReceived: this.nullIfEmpty(dto.materialReceived),
        sitePhotos: dto.sitePhotos ?? [],
        issues: this.nullIfEmpty(dto.issues),
        delays: this.nullIfEmpty(dto.delays),
        remarks: this.nullIfEmpty(dto.remarks),
        preparedById: userId ?? null,
      },
      include: this.reportInclude(),
    });

    await this.auditService.create({
      userId,
      projectId: report.projectId,
      action: AuditAction.CREATE,
      module: 'daily_reports',
      entityName: 'DailyReport',
      entityId: String(report.id),
      description: `Created daily report for ${this.formatDate(report.reportDate)}`,
      newData: report,
    });

    return report;
  }
async getProjectDefaults(projectId: number) {
  const project = await this.prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      code: true,
      name: true,
      location: true,
    },
  });

  if (!project) {
    throw new NotFoundException('Project not found');
  }

const manpowerCount = await this.prisma.projectUser.count({
  where: {
    projectId,
    status: ProjectUserStatus.ACTIVE,
  },
});

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const receivedMaterials = await this.prisma.inventoryTransaction.findMany({
    where: {
      projectId,
      type: InventoryTransactionType.RECEIVE,
      createdAt: {
        gte: today,
        lt: tomorrow,
      },
    },
    include: {
      material: {
        select: {
          code: true,
          name: true,
          unit: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  const materialReceived = receivedMaterials.length
    ? receivedMaterials
        .map(
          (item) =>
            `${item.material.code} - ${item.material.name}: ${item.quantity} ${
              item.unit || item.material.unit
            }`,
        )
        .join('\n')
    : '';

  const weather = project.location
    ? await this.getWeatherByLocation(project.location)
    : '';

  return {
    weather,
    manpowerCount,
    materialReceived,
  };
}

private async getWeatherByLocation(location: string) {
  try {
    const geoResponse = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
        location,
      )}&count=1`,
    );

    const geoData: any = await geoResponse.json();
    const place = geoData?.results?.[0];

    if (!place) {
      return `Weather unavailable for ${location}`;
    }

    const weatherResponse = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,weather_code`,
    );

    const weatherData: any = await weatherResponse.json();
    const current = weatherData?.current;

    if (!current) {
      return `Weather unavailable for ${location}`;
    }

    return `${this.weatherCodeToText(current.weather_code)}, ${current.temperature_2m}°C`;
  } catch {
    return `Weather unavailable for ${location}`;
  }
}

private weatherCodeToText(code: number) {
  const map: Record<number, string> = {
    0: 'Clear sky',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Fog',
    48: 'Rime fog',
    51: 'Light drizzle',
    53: 'Moderate drizzle',
    55: 'Dense drizzle',
    61: 'Slight rain',
    63: 'Moderate rain',
    65: 'Heavy rain',
    80: 'Rain showers',
    95: 'Thunderstorm',
  };

  return map[code] || 'Weather condition';
}

  async findByProject(projectId: number) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return this.prisma.dailyReport.findMany({
      where: { projectId },
      include: this.reportInclude(),
      orderBy: [{ reportDate: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async findOne(id: number) {
    const report = await this.prisma.dailyReport.findUnique({
      where: { id },
      include: this.reportInclude(),
    });

    if (!report) {
      throw new NotFoundException('Daily report not found');
    }

    return report;
  }

  async update(id: number, dto: UpdateDailyReportDto, userId?: number) {
    const oldReport = await this.findOne(id);

    const nextProjectId = dto.projectId ? Number(dto.projectId) : oldReport.projectId;

    if (dto.projectId) {
      const project = await this.prisma.project.findUnique({
        where: { id: nextProjectId },
        select: { id: true },
      });

      if (!project) {
        throw new NotFoundException('Project not found');
      }
    }

    const nextReportDate = dto.reportDate
      ? this.normalizeReportDate(dto.reportDate)
      : oldReport.reportDate;

    if (dto.projectId || dto.reportDate) {
      const duplicate = await this.prisma.dailyReport.findFirst({
        where: {
          projectId: nextProjectId,
          reportDate: nextReportDate,
          NOT: { id },
        },
        select: { id: true },
      });

      if (duplicate) {
        throw new BadRequestException(
          'Another daily report already exists for this project and date',
        );
      }
    }

    const updated = await this.prisma.dailyReport.update({
      where: { id },
      data: {
        projectId: dto.projectId ? Number(dto.projectId) : undefined,
        reportDate: dto.reportDate ? nextReportDate : undefined,
        weather: dto.weather !== undefined ? this.nullIfEmpty(dto.weather) : undefined,
        manpowerCount:
          dto.manpowerCount !== undefined
            ? this.toNonNegativeInt(dto.manpowerCount, 'Manpower count')
            : undefined,
        equipmentUsed:
          dto.equipmentUsed !== undefined
            ? this.nullIfEmpty(dto.equipmentUsed)
            : undefined,
        workCompleted:
          dto.workCompleted !== undefined
            ? this.nullIfEmpty(dto.workCompleted)
            : undefined,
        materialReceived:
          dto.materialReceived !== undefined
            ? this.nullIfEmpty(dto.materialReceived)
            : undefined,
        sitePhotos: dto.sitePhotos !== undefined ? dto.sitePhotos : undefined,
        issues: dto.issues !== undefined ? this.nullIfEmpty(dto.issues) : undefined,
        delays: dto.delays !== undefined ? this.nullIfEmpty(dto.delays) : undefined,
        remarks: dto.remarks !== undefined ? this.nullIfEmpty(dto.remarks) : undefined,
      },
      include: this.reportInclude(),
    });

    await this.auditService.create({
      userId,
      projectId: updated.projectId,
      action: AuditAction.UPDATE,
      module: 'daily_reports',
      entityName: 'DailyReport',
      entityId: String(id),
      description: `Updated daily report for ${this.formatDate(updated.reportDate)}`,
      oldData: oldReport,
      newData: updated,
    });

    return updated;
  }

  async remove(id: number, userId?: number) {
    const oldReport = await this.findOne(id);

    const deleted = await this.prisma.dailyReport.delete({
      where: { id },
    });

    await this.auditService.create({
      userId,
      projectId: oldReport.projectId,
      action: AuditAction.DELETE,
      module: 'daily_reports',
      entityName: 'DailyReport',
      entityId: String(id),
      description: `Deleted daily report for ${this.formatDate(oldReport.reportDate)}`,
      oldData: oldReport,
      newData: deleted,
    });

    return deleted;
  }

  private reportInclude() {
    return {
      project: {
        select: {
          id: true,
          code: true,
          name: true,
        },
      },
      preparedBy: {
        select: {
          id: true,
          name: true,
          email: true,
          jobTitle: true,
        },
      },
    };
  }

  private normalizeReportDate(value: string | Date) {
    if (!value) {
      throw new BadRequestException('Report date is required');
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Invalid report date');
    }

    date.setHours(0, 0, 0, 0);
    return date;
  }

  private toNonNegativeInt(value: unknown, fieldName: string) {
    const numberValue = Number(value ?? 0);

    if (!Number.isInteger(numberValue) || numberValue < 0) {
      throw new BadRequestException(`${fieldName} must be a non-negative whole number`);
    }

    return numberValue;
  }

  private nullIfEmpty(value?: string | null) {
    if (value === undefined || value === null) return null;

    const trimmed = String(value).trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private formatDate(value: Date) {
    return value.toISOString().slice(0, 10);
  }
}