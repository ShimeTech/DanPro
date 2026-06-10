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
import { Permissions } from '../auth/decorators/permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { CreateWbsItemDto } from './dto/create-wbs-item.dto';
import { UpdateWbsItemDto } from './dto/update-wbs-item.dto';
import { WbsService } from './wbs.service';

@Controller('wbs')
@UseGuards(JwtAuthGuard)
export class WbsController {
  constructor(private readonly wbsService: WbsService) {}

  @Post()
  @Permissions('planning:manage')
  create(@Body() dto: CreateWbsItemDto, @CurrentUser() user: any) {
    return this.wbsService.create(dto, Number(user.sub));
  }

  @Get('project/:projectId')
  @Permissions('planning:manage')
  findByProject(@Param('projectId', ParseIntPipe) projectId: number) {
    return this.wbsService.findByProject(projectId);
  }

  @Get(':id')
  @Permissions('planning:manage')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.wbsService.findOne(id);
  }

  @Patch(':id')
  @Permissions('planning:manage')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateWbsItemDto,
    @CurrentUser() user: any,
  ) {
    return this.wbsService.update(id, dto, Number(user.sub));
  }

  @Delete(':id')
  @Permissions('planning:manage')
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.wbsService.remove(id, Number(user.sub));
  }
}