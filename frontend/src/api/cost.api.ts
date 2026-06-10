import { api } from './client';

export type CostStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
export type ExpenseType = 'MATERIAL' | 'LABOR' | 'EQUIPMENT' | 'SUBCONTRACTOR' | 'GENERAL' | 'OTHER';

export type BoqItem = {
  id: number;
  projectId: number;
  code: string;
  description: string;
  unit: string;
  quantity: string | number;
  unitRate: string | number;
  totalAmount: string | number;
  createdAt?: string;
  updatedAt?: string;
};

export type Budget = {
  id: number;
  projectId: number;
  code: string;
  title: string;
  description?: string | null;
  amount: string | number;
  status: CostStatus | string;
  createdAt?: string;
  updatedAt?: string;
};

export type Expense = {
  id: number;
  projectId: number;
  code: string;
  description: string;
  type: ExpenseType | string;
  amount: string | number;
  expenseDate: string;
  reference?: string | null;
  paidTo?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type Variation = {
  id: number;
  projectId: number;
  code: string;
  title: string;
  description: string;
  amount: string | number;
  status: CostStatus | string;
  submittedAt?: string | null;
  approvedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type CostSummary = {
  projectId: number;
  boqTotal: number;
  budgetTotal: number;
  approvedVariationTotal: number;
  revisedBudget: number;
  actualCost: number;
  remainingBudget: number;
  costPerformancePercent: number;
};

export type CreateBoqItemPayload = {
  projectId: number;
  code: string;
  description: string;
  unit: string;
  quantity: number | string;
  unitRate: number | string;
};

export type CreateBudgetPayload = {
  projectId: number;
  code: string;
  title: string;
  description?: string;
  amount: number | string;
  status?: CostStatus | string;
};

export type CreateExpensePayload = {
  projectId: number;
  code: string;
  description: string;
  type?: ExpenseType | string;
  amount: number | string;
  expenseDate: string;
  reference?: string;
  paidTo?: string;
};

export type CreateVariationPayload = {
  projectId: number;
  code: string;
  title: string;
  description: string;
  amount: number | string;
  status?: CostStatus | string;
};

export const costApi = {
  createBoqItem: async (data: CreateBoqItemPayload): Promise<BoqItem> => {
    const response = await api.post('/cost/boq-items', data);
    return response.data;
  },

  findBoqItems: async (projectId: number): Promise<BoqItem[]> => {
    const response = await api.get(`/cost/projects/${projectId}/boq-items`);
    return response.data;
  },

  findBoqItem: async (id: number): Promise<BoqItem> => {
    const response = await api.get(`/cost/boq-items/${id}`);
    return response.data;
  },

  updateBoqItem: async (id: number, data: Partial<CreateBoqItemPayload>): Promise<BoqItem> => {
    const response = await api.patch(`/cost/boq-items/${id}`, data);
    return response.data;
  },

  removeBoqItem: async (id: number): Promise<BoqItem> => {
    const response = await api.delete(`/cost/boq-items/${id}`);
    return response.data;
  },

  createBudget: async (data: CreateBudgetPayload): Promise<Budget> => {
    const response = await api.post('/cost/budgets', data);
    return response.data;
  },

  findBudgets: async (projectId: number): Promise<Budget[]> => {
    const response = await api.get(`/cost/projects/${projectId}/budgets`);
    return response.data;
  },

  findBudget: async (id: number): Promise<Budget> => {
    const response = await api.get(`/cost/budgets/${id}`);
    return response.data;
  },

  updateBudget: async (id: number, data: Partial<CreateBudgetPayload>): Promise<Budget> => {
    const response = await api.patch(`/cost/budgets/${id}`, data);
    return response.data;
  },

  approveBudget: async (id: number): Promise<Budget> => {
    const response = await api.patch(`/cost/budgets/${id}/approve`);
    return response.data;
  },

  rejectBudget: async (id: number): Promise<Budget> => {
    const response = await api.patch(`/cost/budgets/${id}/reject`);
    return response.data;
  },

  removeBudget: async (id: number): Promise<Budget> => {
    const response = await api.delete(`/cost/budgets/${id}`);
    return response.data;
  },

  createExpense: async (data: CreateExpensePayload): Promise<Expense> => {
    const response = await api.post('/cost/expenses', data);
    return response.data;
  },

  findExpenses: async (projectId: number): Promise<Expense[]> => {
    const response = await api.get(`/cost/projects/${projectId}/expenses`);
    return response.data;
  },

  findExpense: async (id: number): Promise<Expense> => {
    const response = await api.get(`/cost/expenses/${id}`);
    return response.data;
  },

  updateExpense: async (id: number, data: Partial<CreateExpensePayload>): Promise<Expense> => {
    const response = await api.patch(`/cost/expenses/${id}`, data);
    return response.data;
  },

  removeExpense: async (id: number): Promise<Expense> => {
    const response = await api.delete(`/cost/expenses/${id}`);
    return response.data;
  },

  createVariation: async (data: CreateVariationPayload): Promise<Variation> => {
    const response = await api.post('/cost/variations', data);
    return response.data;
  },

  findVariations: async (projectId: number): Promise<Variation[]> => {
    const response = await api.get(`/cost/projects/${projectId}/variations`);
    return response.data;
  },

  findVariation: async (id: number): Promise<Variation> => {
    const response = await api.get(`/cost/variations/${id}`);
    return response.data;
  },

  updateVariation: async (id: number, data: Partial<CreateVariationPayload>): Promise<Variation> => {
    const response = await api.patch(`/cost/variations/${id}`, data);
    return response.data;
  },

  submitVariation: async (id: number): Promise<Variation> => {
    const response = await api.patch(`/cost/variations/${id}/submit`);
    return response.data;
  },

  approveVariation: async (id: number): Promise<Variation> => {
    const response = await api.patch(`/cost/variations/${id}/approve`);
    return response.data;
  },

  rejectVariation: async (id: number): Promise<Variation> => {
    const response = await api.patch(`/cost/variations/${id}/reject`);
    return response.data;
  },

  removeVariation: async (id: number): Promise<Variation> => {
    const response = await api.delete(`/cost/variations/${id}`);
    return response.data;
  },

  getSummary: async (projectId: number): Promise<CostSummary> => {
    const response = await api.get(`/cost/projects/${projectId}/summary`);
    return response.data;
  },
};