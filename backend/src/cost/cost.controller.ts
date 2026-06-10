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
import { CostService } from './cost.service';
import { CreateBoqItemDto } from './dto/create-boq-item.dto';
import { UpdateBoqItemDto } from './dto/update-boq-item.dto';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { CreateVariationDto } from './dto/create-variation.dto';
import { UpdateVariationDto } from './dto/update-variation.dto';

@Controller('cost')
@UseGuards(JwtAuthGuard)
export class CostController {
  constructor(private readonly costService: CostService) {}

  @Post('boq-items')
  createBoqItem(@Body() dto: CreateBoqItemDto, @CurrentUser() user: any) {
    return this.costService.createBoqItem(dto, Number(user.sub));
  }

  @Get('projects/:projectId/boq-items')
  findBoqItems(@Param('projectId', ParseIntPipe) projectId: number) {
    return this.costService.findBoqItems(projectId);
  }

  @Get('boq-items/:id')
  findBoqItem(@Param('id', ParseIntPipe) id: number) {
    return this.costService.findBoqItem(id);
  }

  @Patch('boq-items/:id')
  updateBoqItem(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateBoqItemDto, @CurrentUser() user: any) {
    return this.costService.updateBoqItem(id, dto, Number(user.sub));
  }

  @Delete('boq-items/:id')
  removeBoqItem(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.costService.removeBoqItem(id, Number(user.sub));
  }

  @Post('budgets')
  createBudget(@Body() dto: CreateBudgetDto, @CurrentUser() user: any) {
    return this.costService.createBudget(dto, Number(user.sub));
  }

  @Get('projects/:projectId/budgets')
  findBudgets(@Param('projectId', ParseIntPipe) projectId: number) {
    return this.costService.findBudgets(projectId);
  }

  @Get('budgets/:id')
  findBudget(@Param('id', ParseIntPipe) id: number) {
    return this.costService.findBudget(id);
  }

  @Patch('budgets/:id')
  updateBudget(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateBudgetDto, @CurrentUser() user: any) {
    return this.costService.updateBudget(id, dto, Number(user.sub));
  }

  @Patch('budgets/:id/approve')
  approveBudget(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.costService.approveBudget(id, Number(user.sub));
  }

  @Patch('budgets/:id/reject')
  rejectBudget(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.costService.rejectBudget(id, Number(user.sub));
  }

  @Delete('budgets/:id')
  removeBudget(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.costService.removeBudget(id, Number(user.sub));
  }

  @Post('expenses')
  createExpense(@Body() dto: CreateExpenseDto, @CurrentUser() user: any) {
    return this.costService.createExpense(dto, Number(user.sub));
  }

  @Get('projects/:projectId/expenses')
  findExpenses(@Param('projectId', ParseIntPipe) projectId: number) {
    return this.costService.findExpenses(projectId);
  }

  @Get('expenses/:id')
  findExpense(@Param('id', ParseIntPipe) id: number) {
    return this.costService.findExpense(id);
  }

  @Patch('expenses/:id')
  updateExpense(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateExpenseDto, @CurrentUser() user: any) {
    return this.costService.updateExpense(id, dto, Number(user.sub));
  }

  @Delete('expenses/:id')
  removeExpense(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.costService.removeExpense(id, Number(user.sub));
  }

  @Post('variations')
  createVariation(@Body() dto: CreateVariationDto, @CurrentUser() user: any) {
    return this.costService.createVariation(dto, Number(user.sub));
  }

  @Get('projects/:projectId/variations')
  findVariations(@Param('projectId', ParseIntPipe) projectId: number) {
    return this.costService.findVariations(projectId);
  }

  @Get('variations/:id')
  findVariation(@Param('id', ParseIntPipe) id: number) {
    return this.costService.findVariation(id);
  }

  @Patch('variations/:id')
  updateVariation(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateVariationDto, @CurrentUser() user: any) {
    return this.costService.updateVariation(id, dto, Number(user.sub));
  }

  @Patch('variations/:id/submit')
  submitVariation(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.costService.submitVariation(id, Number(user.sub));
  }

  @Patch('variations/:id/approve')
  approveVariation(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.costService.approveVariation(id, Number(user.sub));
  }

  @Patch('variations/:id/reject')
  rejectVariation(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.costService.rejectVariation(id, Number(user.sub));
  }

  @Delete('variations/:id')
  removeVariation(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.costService.removeVariation(id, Number(user.sub));
  }

  @Get('projects/:projectId/summary')
  getProjectCostSummary(@Param('projectId', ParseIntPipe) projectId: number) {
    return this.costService.getProjectCostSummary(projectId);
  }
}
