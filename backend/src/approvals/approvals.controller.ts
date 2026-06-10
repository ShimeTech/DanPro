import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApprovalsService } from './approvals.service';
import { CreateApprovalDto } from './dto/create-approval.dto';
import { ReviewApprovalDto } from './dto/review-approval.dto';

@Controller('approvals')
@UseGuards(JwtAuthGuard)
export class ApprovalsController {
  constructor(private readonly approvalsService: ApprovalsService) {}

  @Post()
  create(@Body() dto: CreateApprovalDto, @CurrentUser() user: any) {
    return this.approvalsService.create(dto, Number(user.sub));
  }

  @Get('project/:projectId')
  findByProject(@Param('projectId', ParseIntPipe) projectId: number) {
    return this.approvalsService.findByProject(projectId);
  }

  @Get('my-pending')
  findMyPending(@CurrentUser() user: any) {
    return this.approvalsService.findPendingByUser(Number(user.sub));
  }

  @Get('entity')
  findByEntity(
    @Query('module') module: string,
    @Query('entityName') entityName: string,
    @Query('entityId') entityId: string,
  ) {
    return this.approvalsService.findByEntity(module, entityName, Number(entityId));
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.approvalsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Partial<CreateApprovalDto>,
    @CurrentUser() user: any,
  ) {
    return this.approvalsService.update(id, dto, Number(user.sub));
  }

  @Patch(':id/review')
  review(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReviewApprovalDto,
    @CurrentUser() user: any,
  ) {
    return this.approvalsService.review(id, dto, Number(user.sub));
  }

  @Patch(':id/cancel')
  cancel(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.approvalsService.cancel(id, Number(user.sub));
  }

  @Patch(':id/reopen')
  reopen(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.approvalsService.reopen(id, Number(user.sub));
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.approvalsService.remove(id, Number(user.sub));
  }
}