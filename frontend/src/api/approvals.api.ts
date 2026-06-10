import { api } from './client';

export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'RETURNED' | 'CANCELLED';

export type Approval = {
  id: number;
  projectId: number;
  userId?: number | null;
  status: ApprovalStatus | string;
  module: string;
  entityName: string;
  entityId: number;
  comments?: string | null;
  approvedAt?: string | null;
  createdAt: string;
  updatedAt?: string;
  project?: {
    id: number;
    code: string;
    name: string;
  };
  user?: { 
    id: number;
    name: string;
    email: string;
    jobTitle?: string | null;
  } | null;
  rfi?: any;
  submittal?: any;
};

export type CreateApprovalPayload = {
  projectId: number;
  userId?: number | null;
  status?: ApprovalStatus | string;
  module: string;
  entityName: string;
  entityId: number;
  rfiId?: number | null;
  submittalId?: number | null;
  comments?: string;
};

export type UpdateApprovalPayload = Partial<CreateApprovalPayload>;

export type ReviewApprovalPayload = {
  status: ApprovalStatus | string;
  comments?: string;
};

export const approvalsApi = {
  findByProject: async (projectId: number): Promise<Approval[]> => {
    const response = await api.get(`/approvals/project/${projectId}`);
    return response.data;
  },

  findMyPending: async (): Promise<Approval[]> => {
    const response = await api.get('/approvals/my-pending');
    return response.data;
  },

  findByEntity: async (
    module: string,
    entityName: string,
    entityId: number,
  ): Promise<Approval[]> => {
    const response = await api.get('/approvals/entity', {
      params: { module, entityName, entityId },
    });
    return response.data;
  },

  findOne: async (id: number): Promise<Approval> => {
    const response = await api.get(`/approvals/${id}`);
    return response.data;
  },

  create: async (data: CreateApprovalPayload): Promise<Approval> => {
    const response = await api.post('/approvals', data);
    return response.data;
  },

  update: async (id: number, data: UpdateApprovalPayload): Promise<Approval> => {
    const response = await api.patch(`/approvals/${id}`, data);
    return response.data;
  },

  review: async (id: number, data: ReviewApprovalPayload): Promise<Approval> => {
    const response = await api.patch(`/approvals/${id}/review`, data);
    return response.data;
  },

  cancel: async (id: number): Promise<Approval> => {
    const response = await api.patch(`/approvals/${id}/cancel`);
    return response.data;
  },

  reopen: async (id: number): Promise<Approval> => {
    const response = await api.patch(`/approvals/${id}/reopen`);
    return response.data;
  },

  remove: async (id: number): Promise<Approval> => {
    const response = await api.delete(`/approvals/${id}`);
    return response.data;
  },
};