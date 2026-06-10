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
import { Permissions } from '../auth/decorators/permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { ProjectsService } from './projects.service';
import { AssignProjectUserDto } from './dto/assign-project-user.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectUserDto } from './dto/update-project-user.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Controller('projects')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @Permissions('projects:create')
  create(@Body() dto: CreateProjectDto, @CurrentUser() user: any) {
    return this.projectsService.create(dto, Number(user.sub));
  }

  @Get()
  @Permissions('projects:read')
  findAll(@Query('companyId') companyId?: string) {
    return this.projectsService.findAll(
      companyId ? Number(companyId) : undefined,
    );
  }

  @Get(':id')
  @Permissions('projects:read')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.projectsService.findOne(id);
  }

  @Patch(':id')
  @Permissions('projects:update')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProjectDto,
    @CurrentUser() user: any,
  ) {
    return this.projectsService.update(id, dto, Number(user.sub));
  }

  @Delete(':id')
  @Permissions('projects:delete')
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.projectsService.remove(id, Number(user.sub));
  }

  @Post(':id/users')
  @Permissions('projects:update')
  assignUser(
    @Param('id', ParseIntPipe) projectId: number,
    @Body() dto: AssignProjectUserDto,
    @CurrentUser() user: any,
  ) {
    return this.projectsService.assignUser(projectId, dto, Number(user.sub));
  }

  @Get(':id/users')
  @Permissions('projects:read')
  listProjectUsers(@Param('id', ParseIntPipe) projectId: number) {
    return this.projectsService.listProjectUsers(projectId);
  }

  @Patch(':id/users/:userId')
  @Permissions('projects:update')
  updateProjectUser(
    @Param('id', ParseIntPipe) projectId: number,
    @Param('userId', ParseIntPipe) userId: number,
    @Body() dto: UpdateProjectUserDto,
    @CurrentUser() currentUser: any,
  ) {
    return this.projectsService.updateProjectUser(
      projectId,
      userId,
      dto,
      Number(currentUser.sub),
    );
  }

  @Delete(':id/users/:userId')
  @Permissions('projects:update')
  removeProjectUser(
    @Param('id', ParseIntPipe) projectId: number,
    @Param('userId', ParseIntPipe) userId: number,
    @CurrentUser() currentUser: any,
  ) {
    return this.projectsService.removeProjectUser(
      projectId,
      userId,
      Number(currentUser.sub),
    );
  }
}