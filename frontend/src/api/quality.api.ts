import { api } from './client';

export type InspectionStatus = 'PLANNED' | 'PASSED' | 'FAILED' | 'CANCELLED';
export type NcrStatus = 'OPEN' | 'UNDER_REVIEW' | 'CLOSED';

export type QualityChecklistItem = {
  item: string;
  required?: boolean;
};

export type QualityChecklist = {
  id: number;
  projectId: number;
  code: string;
  title: string;
  description?: string | null;
  items?: QualityChecklistItem[];
  createdAt?: string;
  updatedAt?: string;
  project?: {
    id: number;
    code: string;
    name: string;
  };
};

export type Inspection = {
  id: number;
  projectId: number;
  checklistId?: number | null;
  code: string;
  title: string;
  location?: string | null;
  inspectionDate?: string | null;
  status: InspectionStatus | string;
  result?: string | null;
  createdById?: number | null;
  inspectorId?: number | null;
  createdAt?: string;
  updatedAt?: string;
  checklist?: QualityChecklist | null;
  inspector?: {
    id: number;
    name: string;
    email: string;
    jobTitle?: string | null;
  } | null;
};

export type NcrReport = {
  id: number;
  projectId: number;
  code: string;
  title: string;
  description: string;
  status: NcrStatus | string;
  correctiveAction?: string | null;
  dueDate?: string | null;
  closedAt?: string | null;
  assignedToId?: number | null;
  createdById?: number | null;
  createdAt?: string;
  updatedAt?: string;
  assignedTo?: {
    id: number;
    name: string;
    email: string;
    jobTitle?: string | null;
  } | null;
};

export type CreateChecklistPayload = {
  projectId: number;
  code: string;
  title: string;
  description?: string;
  items?: QualityChecklistItem[];
};

export type CreateInspectionPayload = {
  projectId: number;
  checklistId?: number | null;
  code: string;
  title: string;
  location?: string;
  inspectionDate?: string;
  status?: InspectionStatus | string;
  result?: string;
  inspectorId?: number | null;
};

export type CreateNcrPayload = {
  projectId: number;
  code: string;
  title: string;
  description: string;
  status?: NcrStatus | string;
  correctiveAction?: string;
  dueDate?: string;
  assignedToId?: number | null;
};

export const qualityApi = {
  createChecklist: async (data: CreateChecklistPayload): Promise<QualityChecklist> => {
    const response = await api.post('/quality/checklists', data);
    return response.data;
  },

  findChecklists: async (projectId: number): Promise<QualityChecklist[]> => {
    const response = await api.get(`/quality/projects/${projectId}/checklists`);
    return response.data;
  },

  findChecklist: async (id: number): Promise<QualityChecklist> => {
    const response = await api.get(`/quality/checklists/${id}`);
    return response.data;
  },

  updateChecklist: async (
    id: number,
    data: Partial<CreateChecklistPayload>,
  ): Promise<QualityChecklist> => {
    const response = await api.patch(`/quality/checklists/${id}`, data);
    return response.data;
  },

  removeChecklist: async (id: number): Promise<QualityChecklist> => {
    const response = await api.delete(`/quality/checklists/${id}`);
    return response.data;
  },

  createInspection: async (data: CreateInspectionPayload): Promise<Inspection> => {
    const response = await api.post('/quality/inspections', data);
    return response.data;
  },

  findInspections: async (projectId: number): Promise<Inspection[]> => {
    const response = await api.get(`/quality/projects/${projectId}/inspections`);
    return response.data;
  },

  findInspection: async (id: number): Promise<Inspection> => {
    const response = await api.get(`/quality/inspections/${id}`);
    return response.data;
  },

  updateInspection: async (
    id: number,
    data: Partial<CreateInspectionPayload>,
  ): Promise<Inspection> => {
    const response = await api.patch(`/quality/inspections/${id}`, data);
    return response.data;
  },

  removeInspection: async (id: number): Promise<Inspection> => {
    const response = await api.delete(`/quality/inspections/${id}`);
    return response.data;
  },

  createNcr: async (data: CreateNcrPayload): Promise<NcrReport> => {
    const response = await api.post('/quality/ncrs', data);
    return response.data;
  },

  findNcrs: async (projectId: number): Promise<NcrReport[]> => {
    const response = await api.get(`/quality/projects/${projectId}/ncrs`);
    return response.data;
  },

  findNcr: async (id: number): Promise<NcrReport> => {
    const response = await api.get(`/quality/ncrs/${id}`);
    return response.data;
  },

  updateNcr: async (id: number, data: Partial<CreateNcrPayload>): Promise<NcrReport> => {
    const response = await api.patch(`/quality/ncrs/${id}`, data);
    return response.data;
  },

  closeNcr: async (id: number): Promise<NcrReport> => {
    const response = await api.patch(`/quality/ncrs/${id}/close`);
    return response.data;
  },

  reopenNcr: async (id: number): Promise<NcrReport> => {
    const response = await api.patch(`/quality/ncrs/${id}/reopen`);
    return response.data;
  },

  removeNcr: async (id: number): Promise<NcrReport> => {
    const response = await api.delete(`/quality/ncrs/${id}`);
    return response.data;
  },
};
