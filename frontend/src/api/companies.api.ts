import { api } from './client';

export type Company = {
  id: number;
  name: string;
  legalName?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  taxNumber?: string | null;
  currency: string;
  timezone: string;
  language: string;
  isActive: boolean;
  createdAt: string;
};

export type CreateCompanyPayload = {
  name: string;
  legalName?: string;
  email?: string;
  phone?: string;
  address?: string;
  taxNumber?: string;
  currency?: string;
  timezone?: string;
  language?: string;
};

export const companiesApi = {
  findAll: async (): Promise<Company[]> => {
    const response = await api.get('/companies');
    return response.data;
  },

  create: async (data: CreateCompanyPayload): Promise<Company> => {
    const response = await api.post('/companies', data);
    return response.data;
  },

  update: async (
    id: number,
    data: Partial<CreateCompanyPayload>,
  ): Promise<Company> => {
    const response = await api.patch(`/companies/${id}`, data);
    return response.data;
  },

  remove: async (id: number): Promise<Company> => {
    const response = await api.delete(`/companies/${id}`);
    return response.data;
  },
};