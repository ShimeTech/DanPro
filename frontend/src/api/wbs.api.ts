import { api } from './client';

export type WbsItem = {
  id: number;
  projectId: number;
  parentId?: number | null;
  code: string;
  name: string;
  description?: string | null;
  sortOrder: number;
  parent?: WbsItem | null;
  children?: WbsItem[];
};

export type CreateWbsPayload = {
  projectId: number;
  parentId?: number | null;
  name: string;
  description?: string;
  sortOrder?: number;
};

export type UpdateWbsPayload = Partial<CreateWbsPayload>;

export const wbsApi = {
  findByProject: async (projectId: number): Promise<WbsItem[]> => {
    const response = await api.get(`/wbs/project/${projectId}`);
    return response.data;
  },

  create: async (data: CreateWbsPayload): Promise<WbsItem> => {
    const response = await api.post('/wbs', data);
    return response.data;
  },

  update: async (id: number, data: UpdateWbsPayload): Promise<WbsItem> => {
    const response = await api.patch(`/wbs/${id}`, data);
    return response.data;
  },

  remove: async (id: number): Promise<WbsItem> => {
    const response = await api.delete(`/wbs/${id}`);
    return response.data;
  },
};