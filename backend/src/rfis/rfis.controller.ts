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
import { CreateRfiDto } from './dto/create-rfi.dto';
import { RespondRfiDto } from './dto/respond-rfi.dto';
import { UpdateRfiDto } from './dto/update-rfi.dto';
import { RfisService } from './rfis.service';

@Controller('rfis')
@UseGuards(JwtAuthGuard)
export class RfisController {
  constructor(private readonly rfisService: RfisService) {}

  @Post()
  create(@Body() dto: CreateRfiDto, @CurrentUser() user: any) {
    return this.rfisService.create(dto, Number(user.sub));
  }

  @Get('project/:projectId')
  findByProject(@Param('projectId', ParseIntPipe) projectId: number) {
    return this.rfisService.findByProject(projectId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.rfisService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRfiDto,
    @CurrentUser() user: any,
  ) {
    return this.rfisService.update(id, dto, Number(user.sub));
  }

  @Patch(':id/respond')
  respond(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RespondRfiDto,
    @CurrentUser() user: any,
  ) {
    return this.rfisService.respond(id, dto, Number(user.sub));
  }

  @Patch(':id/close')
  close(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.rfisService.close(id, Number(user.sub));
  }

  @Patch(':id/reopen')
  reopen(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.rfisService.reopen(id, Number(user.sub));
  }

  @Patch(':id/reject')
  reject(
    @Param('id', ParseIntPipe) id: number,
    @Body('response') response: string,
    @CurrentUser() user: any,
  ) {
    return this.rfisService.reject(id, response, Number(user.sub));
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.rfisService.remove(id, Number(user.sub));
  }
}
