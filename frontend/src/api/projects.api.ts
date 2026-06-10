import { api } from './client';

export type Project = {
  id: number;
  companyId: number;
  code: string;
  name: string;
  description?: string | null;
  clientName?: string | null;
  location?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  budget?: string | number | null;
  currency: string;
  status: string;
  company?: {
    id: number;
    name: string;
  };
};

export type CreateProjectPayload = {
  companyId: number;
  code: string;
  name: string;
  description?: string;
  clientName?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  budget?: number; 
  currency?: string;
  status?: string;
};

export const projectsApi = {
  findAll: async (companyId?: number): Promise<Project[]> => {
    const response = await api.get('/projects', {
      params: companyId ? { companyId } : undefined,
    });

    return response.data;
  },

  create: async (data: CreateProjectPayload): Promise<Project> => {
    const response = await api.post('/projects', data);
    return response.data;
  },

update: async (id: number, data: Partial<CreateProjectPayload>) => {
  const response = await api.patch(`/projects/${id}`, data);
  return response.data;
},

remove: async (id: number) => {
  const response = await api.delete(`/projects/${id}`);
  return response.data;
},

};