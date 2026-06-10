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
import { SafetyService } from './safety.service';
import { CreateIncidentDto } from './dto/create-incident.dto';
import { UpdateIncidentDto } from './dto/update-incident.dto';
import { CreateRiskAssessmentDto } from './dto/create-risk-assessment.dto';
import { UpdateRiskAssessmentDto } from './dto/update-risk-assessment.dto';
import { CreateToolboxTalkDto } from './dto/create-toolbox-talk.dto';
import { UpdateToolboxTalkDto } from './dto/update-toolbox-talk.dto';
import { CreateSafetyInspectionDto } from './dto/create-safety-inspection.dto';
import { UpdateSafetyInspectionDto } from './dto/update-safety-inspection.dto';

@Controller('safety')
@UseGuards(JwtAuthGuard)
export class SafetyController {
  constructor(private readonly safetyService: SafetyService) {}

  @Post('incidents')
  createIncident(@Body() dto: CreateIncidentDto, @CurrentUser() user: any) {
    return this.safetyService.createIncident(dto, Number(user.sub));
  }

  @Get('projects/:projectId/incidents')
  findIncidents(@Param('projectId', ParseIntPipe) projectId: number) {
    return this.safetyService.findIncidents(projectId);
  }

  @Get('incidents/:id')
  findIncident(@Param('id', ParseIntPipe) id: number) {
    return this.safetyService.findIncident(id);
  }

  @Patch('incidents/:id')
  updateIncident(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateIncidentDto,
    @CurrentUser() user: any,
  ) {
    return this.safetyService.updateIncident(id, dto, Number(user.sub));
  }

  @Patch('incidents/:id/close')
  closeIncident(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.safetyService.closeIncident(id, Number(user.sub));
  }

  @Patch('incidents/:id/reopen')
  reopenIncident(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.safetyService.reopenIncident(id, Number(user.sub));
  }

  @Delete('incidents/:id')
  removeIncident(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.safetyService.removeIncident(id, Number(user.sub));
  }

  @Post('risk-assessments')
  createRiskAssessment(@Body() dto: CreateRiskAssessmentDto, @CurrentUser() user: any) {
    return this.safetyService.createRiskAssessment(dto, Number(user.sub));
  }

  @Get('projects/:projectId/risk-assessments')
  findRiskAssessments(@Param('projectId', ParseIntPipe) projectId: number) {
    return this.safetyService.findRiskAssessments(projectId);
  }

  @Get('risk-assessments/:id')
  findRiskAssessment(@Param('id', ParseIntPipe) id: number) {
    return this.safetyService.findRiskAssessment(id);
  }

  @Patch('risk-assessments/:id')
  updateRiskAssessment(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRiskAssessmentDto,
    @CurrentUser() user: any,
  ) {
    return this.safetyService.updateRiskAssessment(id, dto, Number(user.sub));
  }

  @Delete('risk-assessments/:id')
  removeRiskAssessment(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.safetyService.removeRiskAssessment(id, Number(user.sub));
  }

  @Post('toolbox-talks')
  createToolboxTalk(@Body() dto: CreateToolboxTalkDto, @CurrentUser() user: any) {
    return this.safetyService.createToolboxTalk(dto, Number(user.sub));
  }

  @Get('projects/:projectId/toolbox-talks')
  findToolboxTalks(@Param('projectId', ParseIntPipe) projectId: number) {
    return this.safetyService.findToolboxTalks(projectId);
  }

  @Get('toolbox-talks/:id')
  findToolboxTalk(@Param('id', ParseIntPipe) id: number) {
    return this.safetyService.findToolboxTalk(id);
  }

  @Patch('toolbox-talks/:id')
  updateToolboxTalk(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateToolboxTalkDto,
    @CurrentUser() user: any,
  ) {
    return this.safetyService.updateToolboxTalk(id, dto, Number(user.sub));
  }

  @Delete('toolbox-talks/:id')
  removeToolboxTalk(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.safetyService.removeToolboxTalk(id, Number(user.sub));
  }

  @Post('inspections')
  createSafetyInspection(@Body() dto: CreateSafetyInspectionDto, @CurrentUser() user: any) {
    return this.safetyService.createSafetyInspection(dto, Number(user.sub));
  }

  @Get('projects/:projectId/inspections')
  findSafetyInspections(@Param('projectId', ParseIntPipe) projectId: number) {
    return this.safetyService.findSafetyInspections(projectId);
  }

  @Get('inspections/:id')
  findSafetyInspection(@Param('id', ParseIntPipe) id: number) {
    return this.safetyService.findSafetyInspection(id);
  }

  @Patch('inspections/:id')
  updateSafetyInspection(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSafetyInspectionDto,
    @CurrentUser() user: any,
  ) {
    return this.safetyService.updateSafetyInspection(id, dto, Number(user.sub));
  }

  @Delete('inspections/:id')
  removeSafetyInspection(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.safetyService.removeSafetyInspection(id, Number(user.sub));
  }
}
