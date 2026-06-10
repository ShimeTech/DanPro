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
import { CreateBaselineDto } from './dto/create-baseline.dto';
import { UpdateBaselineDto } from './dto/update-baseline.dto';
import { SchedulesService } from './schedules.service';

@Controller('schedules')
@UseGuards(JwtAuthGuard)
export class SchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  @Post('baselines')
  createBaseline(@Body() dto: CreateBaselineDto, @CurrentUser() user: any) {
    return this.schedulesService.createBaseline(dto, Number(user.sub));
  }

  @Get('projects/:projectId/baselines')
  findByProject(@Param('projectId', ParseIntPipe) projectId: number) {
    return this.schedulesService.findByProject(projectId);
  }

  @Get('baselines/:id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.schedulesService.findOne(id);
  }

  @Patch('baselines/:id')
  updateBaseline(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateBaselineDto,
    @CurrentUser() user: any,
  ) {
    return this.schedulesService.updateBaseline(id, dto, Number(user.sub));
  }

  @Post('baselines/:id/submit')
  submitBaselineForApproval(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ) {
    return this.schedulesService.submitBaselineForApproval(id, Number(user.sub));
  }

  @Post('baselines/:id/approve')
  approveBaseline(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ) {
    return this.schedulesService.approveBaseline(id, Number(user.sub));
  }

  @Post('baselines/:id/reject')
  rejectBaseline(
    @Param('id', ParseIntPipe) id: number,
    @Body('reason') reason: string,
    @CurrentUser() user: any,
  ) {
    return this.schedulesService.rejectBaseline(id, reason, Number(user.sub));
  }

  @Post('baselines/:id/unlock')
  unlockBaseline(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ) {
    return this.schedulesService.unlockBaseline(id, Number(user.sub));
  }

  @Patch('baselines/:id/activate')
  activateBaseline(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ) {
    return this.schedulesService.activateBaseline(id, Number(user.sub));
  }

  @Delete('baselines/:id')
  removeBaseline(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ) {
    return this.schedulesService.removeBaseline(id, Number(user.sub));
  }

  @Delete('baselines/:id/hard-delete')
  deleteBaseline(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ) {
    return this.schedulesService.deleteBaseline(id, Number(user.sub));
  }
}