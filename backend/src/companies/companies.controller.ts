import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AssignCompanyUserDto } from './dto/assign-company-user.dto';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyUserDto } from './dto/update-company-user.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { CompaniesService } from './companies.service';

@Controller('companies')
@UseGuards(JwtAuthGuard)
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Post()
  create(@Body() dto: CreateCompanyDto, @Req() req: any) {
    return this.companiesService.create(dto, Number(req.user?.sub));
  }

  @Get()
  findAll() {
    return this.companiesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.companiesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCompanyDto,
    @Req() req: any,
  ) {
    return this.companiesService.update(id, dto, Number(req.user?.sub));
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.companiesService.remove(id, Number(req.user?.sub));
  }

  @Post(':id/users')
  assignUser(
    @Param('id', ParseIntPipe) companyId: number,
    @Body() dto: AssignCompanyUserDto,
    @Req() req: any,
  ) {
    return this.companiesService.assignUser(
      companyId,
      dto,
      Number(req.user?.sub),
    );
  }

  @Get(':id/users')
  listCompanyUsers(@Param('id', ParseIntPipe) companyId: number) {
    return this.companiesService.listCompanyUsers(companyId);
  }

  @Patch(':id/users/:userId')
  updateCompanyUser(
    @Param('id', ParseIntPipe) companyId: number,
    @Param('userId', ParseIntPipe) userId: number,
    @Body() dto: UpdateCompanyUserDto,
    @Req() req: any,
  ) {
    return this.companiesService.updateCompanyUser(
      companyId,
      userId,
      dto,
      Number(req.user?.sub),
    );
  }

  @Delete(':id/users/:userId')
  removeCompanyUser(
    @Param('id', ParseIntPipe) companyId: number,
    @Param('userId', ParseIntPipe) userId: number,
    @Req() req: any,
  ) {
    return this.companiesService.removeCompanyUser(
      companyId,
      userId,
      Number(req.user?.sub),
    );
  }
}