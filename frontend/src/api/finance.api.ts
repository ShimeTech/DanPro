import { api } from './client';

export type InvoiceStatus = 'DRAFT' | 'SENT' | 'PARTIALLY_PAID' | 'PAID' | 'CANCELLED';
export type PaymentStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
export type PaymentType = 'ADVANCE' | 'PROGRESS' | 'RETENTION' | 'FINAL' | 'OTHER';

export type Invoice = {
  id: number;
  projectId: number;
  code: string;
  title: string;
  description?: string | null;
  invoiceDate: string;
  dueDate?: string | null;
  subtotal: string | number;
  taxAmount: string | number;
  retentionAmount: string | number;
  advanceDeduction: string | number;
  totalAmount: string | number;
  status: InvoiceStatus | string;
  payments?: Payment[];
};

export type Payment = {
  id: number;
  projectId: number;
  invoiceId?: number | null;
  code: string;
  type: PaymentType | string;
  status: PaymentStatus | string;
  amount: string | number;
  paymentDate?: string | null;
  reference?: string | null;
  paidBy?: string | null;
  paidTo?: string | null;
  notes?: string | null;
  invoice?: {
    id: number;
    code: string;
    title: string;
    totalAmount: string | number;
    status: string;
  } | null;
};

export type CashFlowSummary = {
  projectId: number;
  invoicedAmount: number;
  receivedAmount: number;
  expenseAmount: number;
  retentionHeld: number;
  advanceDeducted: number;
  netCashFlow: number;
  outstandingReceivable: number;
};

export type CreateInvoicePayload = {
  projectId: number;
  code: string;
  title: string;
  description?: string;
  invoiceDate: string;
  dueDate?: string;
  subtotal: number | string;
  taxAmount?: number | string;
  retentionAmount?: number | string;
  advanceDeduction?: number | string;
  status?: InvoiceStatus | string;
};

export type CreatePaymentPayload = {
  projectId: number;
  invoiceId?: number | null;
  code: string;
  type?: PaymentType | string;
  status?: PaymentStatus | string;
  amount: number | string;
  paymentDate?: string;
  reference?: string;
  paidBy?: string;
  paidTo?: string;
  notes?: string;
};

export const financeApi = {
  createInvoice: async (data: CreateInvoicePayload): Promise<Invoice> => {
    const response = await api.post('/finance/invoices', data);
    return response.data;
  },

  findInvoices: async (projectId: number): Promise<Invoice[]> => {
    const response = await api.get(`/finance/projects/${projectId}/invoices`);
    return response.data;
  },

  findInvoice: async (id: number): Promise<Invoice> => {
    const response = await api.get(`/finance/invoices/${id}`);
    return response.data;
  },

  updateInvoice: async (id: number, data: Partial<CreateInvoicePayload>): Promise<Invoice> => {
    const response = await api.patch(`/finance/invoices/${id}`, data);
    return response.data;
  },

  sendInvoice: async (id: number): Promise<Invoice> => {
    const response = await api.patch(`/finance/invoices/${id}/send`);
    return response.data;
  },

  cancelInvoice: async (id: number): Promise<Invoice> => {
    const response = await api.patch(`/finance/invoices/${id}/cancel`);
    return response.data;
  },

  removeInvoice: async (id: number): Promise<Invoice> => {
    const response = await api.delete(`/finance/invoices/${id}`);
    return response.data;
  },

  createPayment: async (data: CreatePaymentPayload): Promise<Payment> => {
    const response = await api.post('/finance/payments', data);
    return response.data;
  },

  findPayments: async (projectId: number): Promise<Payment[]> => {
    const response = await api.get(`/finance/projects/${projectId}/payments`);
    return response.data;
  },

  findPayment: async (id: number): Promise<Payment> => {
    const response = await api.get(`/finance/payments/${id}`);
    return response.data;
  },

  updatePayment: async (id: number, data: Partial<CreatePaymentPayload>): Promise<Payment> => {
    const response = await api.patch(`/finance/payments/${id}`, data);
    return response.data;
  },

  completePayment: async (id: number): Promise<Payment> => {
    const response = await api.patch(`/finance/payments/${id}/complete`);
    return response.data;
  },

  cancelPayment: async (id: number): Promise<Payment> => {
    const response = await api.patch(`/finance/payments/${id}/cancel`);
    return response.data;
  },

  removePayment: async (id: number): Promise<Payment> => {
    const response = await api.delete(`/finance/payments/${id}`);
    return response.data;
  },

  getCashFlow: async (projectId: number): Promise<CashFlowSummary> => {
    const response = await api.get(`/finance/projects/${projectId}/cash-flow`);
    return response.data;
  },
};