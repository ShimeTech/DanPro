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
import { CreateContactDto } from './dto/create-contact.dto';
import { ContactService } from './contact.service';

@Controller('contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  // Public contact form
  @Post()
  create(@Body() dto: CreateContactDto) {
    return this.contactService.create(dto);
  }

  // Admin notifications
  @Get('notifications')
  @UseGuards(JwtAuthGuard)
  findNotifications(@CurrentUser() user: any) {
    return this.contactService.findNotifications(Number(user.sub));
  }

  @Get('notifications/unread-count')
  @UseGuards(JwtAuthGuard)
  unreadCount(@CurrentUser() user: any) {
    return this.contactService.unreadCount(Number(user.sub));
  }
@Delete('notifications/:id')
@UseGuards(JwtAuthGuard)
remove(
  @Param('id', ParseIntPipe) id: number,
  @CurrentUser() user: any,
) {
  return this.contactService.remove(id, Number(user.sub));
}
  @Patch('notifications/:id/read')
  @UseGuards(JwtAuthGuard)
  markAsRead(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ) {
    return this.contactService.markAsRead(id, Number(user.sub));
  }
}