import { api } from './client';

export type DailyReport = {
  id: number;
  projectId: number;
  reportDate: string;
  weather?: string | null;
  manpowerCount: number;
  equipmentUsed?: string | null;
  workCompleted?: string | null;
  materialReceived?: string | null;
  sitePhotos?: string[];
  issues?: string | null;
  delays?: string | null;
  remarks?: string | null;
  preparedById?: number | null;
  project?: {
    id: number;
    code: string;
    name: string;
  };
  preparedBy?: {
    id: number;
    name: string;
    email: string;
  };
};

export type CreateDailyReportPayload = {
  projectId: number;
  reportDate: string;
  weather?: string;
  manpowerCount?: number;
  equipmentUsed?: string;
  workCompleted?: string;
  materialReceived?: string;
  sitePhotos?: string[];
  issues?: string;
  delays?: string;
  remarks?: string;
};

export type DailyReportDefaults = {
  weather: string;
  manpowerCount: number;
  materialReceived: string;
};

export const dailyReportsApi = {
  findByProject: async (projectId: number): Promise<DailyReport[]> => {
    const response = await api.get(`/daily-reports/project/${projectId}`);
    return response.data;
  },

  getProjectDefaults: async (projectId: number): Promise<DailyReportDefaults> => {
    const response = await api.get(`/daily-reports/project/${projectId}/defaults`);
    return response.data;
  },

  create: async (data: CreateDailyReportPayload): Promise<DailyReport> => {
    const response = await api.post('/daily-reports', data);
    return response.data;
  },

  update: async (
    id: number,
    data: Partial<CreateDailyReportPayload>,
  ): Promise<DailyReport> => {
    const response = await api.patch(`/daily-reports/${id}`, data);
    return response.data;
  },

  remove: async (id: number): Promise<DailyReport> => {
    const response = await api.delete(`/daily-reports/${id}`);
    return response.data;
  },
};