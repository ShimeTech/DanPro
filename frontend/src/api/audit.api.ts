import { api } from './client';

export type AuditLog = {
  id: number;
  userId?: number | null;
  projectId?: number | null;
  action: string;
  module: string;
  entityName: string;
  entityId?: string | null;
  description?: string | null;
  oldData?: any;
  newData?: any;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
  user?: {
    id: number;
    name: string;
    email: string;
  } | null;
  project?: {
    id: number;
    code: string;
    name: string;
  } | null;
};

export type AuditLogFilter = {
  projectId?: number;
  userId?: number;
  module?: string;
  action?: string;
  take?: number;
};

export const auditApi = {
  findAll: async (filter: AuditLogFilter = {}): Promise<AuditLog[]> => {
    const response = await api.get('/audit-logs', { params: filter });
    return response.data;
  },

  findOne: async (id: number): Promise<AuditLog> => {
    const response = await api.get(`/audit-logs/${id}`);
    return response.data;
  },

  findByProject: async (projectId: number): Promise<AuditLog[]> => {
    const response = await api.get(`/audit-logs/project/${projectId}`);
    return response.data;
  },

  findByUser: async (userId: number): Promise<AuditLog[]> => {
    const response = await api.get(`/audit-logs/user/${userId}`);
    return response.data;
  },

  remove: async (id: number): Promise<AuditLog> => {
    const response = await api.delete(`/audit-logs/${id}`);
    return response.data;
  },

  clearOld: async (before: string): Promise<{ count: number }> => {
    const response = await api.delete('/audit-logs', {
      params: { before },
    });
    return response.data;
  },
};