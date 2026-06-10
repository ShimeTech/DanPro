import { api } from './client';

export type MilestoneStatus =
  | 'PLANNED'
  | 'IN_PROGRESS'
  | 'ACHIEVED'
  | 'DELAYED'
  | 'CANCELLED';

export type Milestone = {
  id: number;
  projectId: number;
  code: string;
  name: string;
  description?: string | null;
  plannedDate: string;
  actualDate?: string | null;
  status: MilestoneStatus;
  isActive: boolean;
};

export type CreateMilestonePayload = {
  projectId: number;
  name: string;
  description?: string;
  plannedDate: string;
  actualDate?: string;
  status?: MilestoneStatus;
};

export type UpdateMilestonePayload = Partial<CreateMilestonePayload>;

export const milestonesApi = {
  findByProject: async (projectId: number): Promise<Milestone[]> => {
    const response = await api.get(`/milestones/project/${projectId}`);
    return response.data;
  },

  create: async (data: CreateMilestonePayload): Promise<Milestone> => {
    const response = await api.post('/milestones', data);
    return response.data;
  },

  update: async (
    id: number,
    data: UpdateMilestonePayload,
  ): Promise<Milestone> => {
    const response = await api.patch(`/milestones/${id}`, data);
    return response.data;
  },

  remove: async (id: number): Promise<Milestone> => {
    const response = await api.delete(`/milestones/${id}`);
    return response.data;
  },

  activate: async (id: number): Promise<Milestone> => {
    const response = await api.patch(`/milestones/${id}/activate`);
    return response.data;
  },
};