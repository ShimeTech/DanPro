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
import { CreateSubmittalDto } from './dto/create-submittal.dto';
import { ReviewSubmittalDto } from './dto/review-submittal.dto';
import { UpdateSubmittalDto } from './dto/update-submittal.dto';
import { SubmittalsService } from './submittals.service';
 
@Controller('submittals')
@UseGuards(JwtAuthGuard)
export class SubmittalsController {
  constructor(private readonly submittalsService: SubmittalsService) {}

  @Post()
  create(@Body() dto: CreateSubmittalDto, @CurrentUser() user: any) {
    return this.submittalsService.create(dto, Number(user.sub));
  }

  @Get('project/:projectId')
  findByProject(@Param('projectId', ParseIntPipe) projectId: number) {
    return this.submittalsService.findByProject(projectId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.submittalsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSubmittalDto,
    @CurrentUser() user: any,
  ) {
    return this.submittalsService.update(id, dto, Number(user.sub));
  }

  @Patch(':id/submit')
  submit(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.submittalsService.submit(id, Number(user.sub));
  }

  @Patch(':id/review')
  review(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReviewSubmittalDto,
    @CurrentUser() user: any,
  ) {
    return this.submittalsService.review(id, dto, Number(user.sub));
  }

  @Patch(':id/close')
  close(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.submittalsService.close(id, Number(user.sub));
  }

  @Patch(':id/reopen')
  reopen(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.submittalsService.reopen(id, Number(user.sub));
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.submittalsService.remove(id, Number(user.sub));
  }
}
