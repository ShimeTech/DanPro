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
import { FinanceService } from './finance.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';

@Controller('finance')
@UseGuards(JwtAuthGuard)
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Post('invoices')
  createInvoice(@Body() dto: CreateInvoiceDto, @CurrentUser() user: any) {
    return this.financeService.createInvoice(dto, Number(user.sub));
  }

  @Get('projects/:projectId/invoices')
  findInvoices(@Param('projectId', ParseIntPipe) projectId: number) {
    return this.financeService.findInvoices(projectId);
  }

  @Get('invoices/:id')
  findInvoice(@Param('id', ParseIntPipe) id: number) {
    return this.financeService.findInvoice(id);
  }

  @Patch('invoices/:id')
  updateInvoice(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateInvoiceDto,
    @CurrentUser() user: any,
  ) {
    return this.financeService.updateInvoice(id, dto, Number(user.sub));
  }

  @Patch('invoices/:id/send')
  sendInvoice(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.financeService.sendInvoice(id, Number(user.sub));
  }

  @Patch('invoices/:id/cancel')
  cancelInvoice(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.financeService.cancelInvoice(id, Number(user.sub));
  }

  @Delete('invoices/:id')
  removeInvoice(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.financeService.removeInvoice(id, Number(user.sub));
  }

  @Post('payments')
  createPayment(@Body() dto: CreatePaymentDto, @CurrentUser() user: any) {
    return this.financeService.createPayment(dto, Number(user.sub));
  }

  @Get('projects/:projectId/payments')
  findPayments(@Param('projectId', ParseIntPipe) projectId: number) {
    return this.financeService.findPayments(projectId);
  }

  @Get('payments/:id')
  findPayment(@Param('id', ParseIntPipe) id: number) {
    return this.financeService.findPayment(id);
  }

  @Patch('payments/:id')
  updatePayment(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePaymentDto,
    @CurrentUser() user: any,
  ) {
    return this.financeService.updatePayment(id, dto, Number(user.sub));
  }

  @Patch('payments/:id/complete')
  completePayment(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.financeService.completePayment(id, Number(user.sub));
  }

  @Patch('payments/:id/cancel')
  cancelPayment(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.financeService.cancelPayment(id, Number(user.sub));
  }

  @Delete('payments/:id')
  removePayment(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.financeService.removePayment(id, Number(user.sub));
  }

  @Get('projects/:projectId/cash-flow')
  getCashFlow(@Param('projectId', ParseIntPipe) projectId: number) {
    return this.financeService.getCashFlow(projectId);
  }
}
