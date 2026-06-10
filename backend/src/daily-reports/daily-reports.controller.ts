import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateDailyReportDto } from './dto/create-daily-report.dto';
import { UpdateDailyReportDto } from './dto/update-daily-report.dto';
import { DailyReportsService } from './daily-reports.service';

@Controller('daily-reports')
@UseGuards(JwtAuthGuard)
export class DailyReportsController {
  constructor(private readonly dailyReportsService: DailyReportsService) {} 

  @Post()
  create(@Body() dto: CreateDailyReportDto, @CurrentUser() user: any) {
    return this.dailyReportsService.create(dto, Number(user.sub));
  }

  @Get('project/:projectId')
  findByProject(@Param('projectId', ParseIntPipe) projectId: number) {
    return this.dailyReportsService.findByProject(projectId);
  }
@Get('project/:projectId/defaults')
getProjectDefaults(@Param('projectId', ParseIntPipe) projectId: number) {
  return this.dailyReportsService.getProjectDefaults(projectId);
}
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.dailyReportsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDailyReportDto,
    @CurrentUser() user: any,
  ) {
    return this.dailyReportsService.update(id, dto, Number(user.sub));
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.dailyReportsService.remove(id, Number(user.sub));
  }
}
