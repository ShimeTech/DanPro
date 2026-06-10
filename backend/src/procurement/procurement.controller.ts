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
import { ProcurementService } from './procurement.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { CreatePurchaseRequestDto } from './dto/create-purchase-request.dto';
import { UpdatePurchaseRequestDto } from './dto/update-purchase-request.dto';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';

@Controller('procurement')
@UseGuards(JwtAuthGuard)
export class ProcurementController {
  constructor(private readonly procurementService: ProcurementService) {}

  @Post('suppliers')
  createSupplier(@Body() dto: CreateSupplierDto, @CurrentUser() user: any) {
    return this.procurementService.createSupplier(dto, Number(user.sub));
  }

  @Get('companies/:companyId/suppliers')
  findSuppliers(@Param('companyId', ParseIntPipe) companyId: number) {
    return this.procurementService.findSuppliers(companyId);
  }

  @Get('suppliers/:id')
  findSupplier(@Param('id', ParseIntPipe) id: number) {
    return this.procurementService.findSupplier(id);
  }

  @Patch('suppliers/:id')
  updateSupplier(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSupplierDto,
    @CurrentUser() user: any,
  ) {
    return this.procurementService.updateSupplier(id, dto, Number(user.sub));
  }

  @Patch('suppliers/:id/activate')
  activateSupplier(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.procurementService.activateSupplier(id, Number(user.sub));
  }

  @Patch('suppliers/:id/deactivate')
  deactivateSupplier(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.procurementService.deactivateSupplier(id, Number(user.sub));
  }

  @Delete('suppliers/:id')
  removeSupplier(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.procurementService.removeSupplier(id, Number(user.sub));
  }

  @Post('purchase-requests')
  createPurchaseRequest(@Body() dto: CreatePurchaseRequestDto, @CurrentUser() user: any) {
    return this.procurementService.createPurchaseRequest(dto, Number(user.sub));
  }

  @Get('projects/:projectId/purchase-requests')
  findPurchaseRequests(@Param('projectId', ParseIntPipe) projectId: number) {
    return this.procurementService.findPurchaseRequests(projectId);
  }

  @Get('purchase-requests/:id')
  findPurchaseRequest(@Param('id', ParseIntPipe) id: number) {
    return this.procurementService.findPurchaseRequest(id);
  }

  @Patch('purchase-requests/:id')
  updatePurchaseRequest(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePurchaseRequestDto,
    @CurrentUser() user: any,
  ) {
    return this.procurementService.updatePurchaseRequest(id, dto, Number(user.sub));
  }

  @Patch('purchase-requests/:id/submit')
  submitPurchaseRequest(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.procurementService.submitPurchaseRequest(id, Number(user.sub));
  }

  @Patch('purchase-requests/:id/approve')
  approvePurchaseRequest(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.procurementService.approvePurchaseRequest(id, Number(user.sub));
  }

  @Patch('purchase-requests/:id/reject')
  rejectPurchaseRequest(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.procurementService.rejectPurchaseRequest(id, Number(user.sub));
  }

  @Delete('purchase-requests/:id')
  removePurchaseRequest(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.procurementService.removePurchaseRequest(id, Number(user.sub));
  }

  @Post('purchase-orders')
  createPurchaseOrder(@Body() dto: CreatePurchaseOrderDto, @CurrentUser() user: any) {
    return this.procurementService.createPurchaseOrder(dto, Number(user.sub));
  }

  @Get('projects/:projectId/purchase-orders')
  findPurchaseOrders(@Param('projectId', ParseIntPipe) projectId: number) {
    return this.procurementService.findPurchaseOrders(projectId);
  }

  @Get('purchase-orders/:id')
  findPurchaseOrder(@Param('id', ParseIntPipe) id: number) {
    return this.procurementService.findPurchaseOrder(id);
  }

  @Patch('purchase-orders/:id')
  updatePurchaseOrder(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePurchaseOrderDto,
    @CurrentUser() user: any,
  ) {
    return this.procurementService.updatePurchaseOrder(id, dto, Number(user.sub));
  }

  @Patch('purchase-orders/:id/issue')
  issuePurchaseOrder(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.procurementService.issuePurchaseOrder(id, Number(user.sub));
  }

  @Patch('purchase-orders/:id/close')
  closePurchaseOrder(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.procurementService.closePurchaseOrder(id, Number(user.sub));
  }

  @Patch('purchase-orders/:id/cancel')
  cancelPurchaseOrder(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.procurementService.cancelPurchaseOrder(id, Number(user.sub));
  }

  @Delete('purchase-orders/:id')
  removePurchaseOrder(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.procurementService.removePurchaseOrder(id, Number(user.sub));
  }
}
