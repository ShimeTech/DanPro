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
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post()
  create(@Body() dto: CreateNotificationDto, @CurrentUser() user: any) {
    return this.notificationsService.create(dto, Number(user.sub));
  }

  @Get()
  findMine(@CurrentUser() user: any) {
    return this.notificationsService.findByUser(Number(user.sub));
  }

  @Get('all')
  findAll() {
    return this.notificationsService.findAll();
  }

  @Get('users/:userId')
  findByUser(@Param('userId', ParseIntPipe) userId: number) {
    return this.notificationsService.findByUser(userId);
  }

  @Get('projects/:projectId')
  findByProject(@Param('projectId', ParseIntPipe) projectId: number) {
    return this.notificationsService.findByProject(projectId);
  }

  @Patch('read-all')
  markAllAsRead(@CurrentUser() user: any) {
    return this.notificationsService.markAllAsRead(Number(user.sub));
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.notificationsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateNotificationDto,
    @CurrentUser() user: any,
  ) {
    return this.notificationsService.update(id, dto, Number(user.sub));
  }

  @Patch(':id/read')
  markAsRead(@Param('id', ParseIntPipe) id: number) {
    return this.notificationsService.markAsRead(id);
  }

  @Patch(':id/unread')
  markAsUnread(@Param('id', ParseIntPipe) id: number) {
    return this.notificationsService.markAsUnread(id);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.notificationsService.remove(id, Number(user.sub));
  }
}