import { api } from './client';

export type RfiPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type RfiStatus = 'DRAFT' | 'OPEN' | 'ANSWERED' | 'CLOSED' | 'REJECTED';

export type Rfi = {
  id: number;
  projectId: number;
  code: string;
  title: string;
  question: string;
  response?: string | null;
  status: RfiStatus | string;
  priority: RfiPriority | string; 
  createdById?: number | null;
  assignedToId?: number | null;
  dueDate?: string | null;
  answeredAt?: string | null;
  closedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  project?: {
    id: number;
    code: string;
    name: string;
  } | null;
  createdBy?: {
    id: number;
    name: string;
    email: string;
    jobTitle?: string | null;
  } | null;
  assignedTo?: {
    id: number;
    name: string;
    email: string;
    jobTitle?: string | null;
  } | null;
};

export type CreateRfiPayload = {
  projectId: number;
  title: string;
  question: string;
  status?: RfiStatus | string;
  priority?: RfiPriority | string;
  assignedToId?: number | null;
  dueDate?: string;
};

export type UpdateRfiPayload = Partial<CreateRfiPayload>;

export type RespondRfiPayload = {
  response: string;
  status?: RfiStatus | string;
};

export const rfisApi = {
  findByProject: async (projectId: number): Promise<Rfi[]> => {
    const response = await api.get(`/rfis/project/${projectId}`);
    return response.data;
  },

  findOne: async (id: number): Promise<Rfi> => {
    const response = await api.get(`/rfis/${id}`);
    return response.data;
  },

  create: async (data: CreateRfiPayload): Promise<Rfi> => {
    const response = await api.post('/rfis', data);
    return response.data;
  },

  update: async (id: number, data: UpdateRfiPayload): Promise<Rfi> => {
    const response = await api.patch(`/rfis/${id}`, data);
    return response.data;
  },

  respond: async (id: number, data: RespondRfiPayload): Promise<Rfi> => {
    const response = await api.patch(`/rfis/${id}/respond`, data);
    return response.data;
  },

  close: async (id: number): Promise<Rfi> => {
    const response = await api.patch(`/rfis/${id}/close`);
    return response.data;
  },

  reopen: async (id: number): Promise<Rfi> => {
    const response = await api.patch(`/rfis/${id}/reopen`);
    return response.data;
  },

  reject: async (id: number, response?: string): Promise<Rfi> => {
    const apiResponse = await api.patch(`/rfis/${id}/reject`, { response });
    return apiResponse.data;
  },

  remove: async (id: number): Promise<Rfi> => {
    const response = await api.delete(`/rfis/${id}`);
    return response.data;
  },
};
