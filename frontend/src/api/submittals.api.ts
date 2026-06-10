import { api } from './client';

export type SubmittalStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'APPROVED_WITH_COMMENTS'
  | 'REJECTED'
  | 'REVISE_AND_RESUBMIT'
  | 'CLOSED';

export type Submittal = {
  id: number;
  projectId: number;

  code: string;
  submittalNo?: string | null;

  title: string;
  description?: string | null;
  specificationReference?: string | null;

  status: SubmittalStatus | string;
  revision?: string | null;
  reviewCycle?: number | null;

  submittedAt?: string | null;
  submissionDate?: string | null;
  reviewDate?: string | null;
  approvalDate?: string | null;
  dueDate?: string | null;
  closedAt?: string | null;

  comments?: string | null;
  rejectionReason?: string | null;

  createdAt?: string;
  updatedAt?: string;

  createdById?: number | null;
  submittedById?: number | null;
  reviewerId?: number | null;
  reviewedById?: number | null;
  documentId?: number | null;

  project?: { id: number; code: string; name: string } | null;
  document?: { id: number; code: string; title: string } | null;

  createdBy?: { id: number; name: string; email: string; jobTitle?: string | null } | null;
  submittedBy?: { id: number; name: string; email: string; jobTitle?: string | null } | null;
  reviewer?: { id: number; name: string; email: string; jobTitle?: string | null } | null;
  reviewedBy?: { id: number; name: string; email: string; jobTitle?: string | null } | null;
};

export type CreateSubmittalPayload = {
  projectId: number;
  title: string;
  description?: string;
  specificationReference?: string;
  status?: SubmittalStatus | string;
  revision?: string;
  dueDate?: string;
  reviewerId?: number | null;
  documentId?: number | null;
};

export type UpdateSubmittalPayload = Partial<CreateSubmittalPayload>;

export type ReviewSubmittalPayload = {
  status: SubmittalStatus | string;
  comments?: string;
  rejectionReason?: string;
};

export const submittalsApi = {
  findByProject: async (projectId: number): Promise<Submittal[]> => {
    const response = await api.get(`/submittals/project/${projectId}`);
    return response.data;
  },

  findOne: async (id: number): Promise<Submittal> => {
    const response = await api.get(`/submittals/${id}`);
    return response.data;
  },

  create: async (data: CreateSubmittalPayload): Promise<Submittal> => {
    const response = await api.post('/submittals', data);
    return response.data;
  },

  update: async (id: number, data: UpdateSubmittalPayload): Promise<Submittal> => {
    const response = await api.patch(`/submittals/${id}`, data);
    return response.data;
  },

  submit: async (id: number): Promise<Submittal> => {
    const response = await api.patch(`/submittals/${id}/submit`);
    return response.data;
  },

  review: async (id: number, data: ReviewSubmittalPayload): Promise<Submittal> => {
    const response = await api.patch(`/submittals/${id}/review`, data);
    return response.data;
  },

  close: async (id: number): Promise<Submittal> => {
    const response = await api.patch(`/submittals/${id}/close`);
    return response.data;
  },

  reopen: async (id: number): Promise<Submittal> => {
    const response = await api.patch(`/submittals/${id}/reopen`);
    return response.data;
  },

  remove: async (id: number): Promise<Submittal> => {
    const response = await api.delete(`/submittals/${id}`);
    return response.data;
  },
};