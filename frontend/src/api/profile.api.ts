import { api } from './client';

export type ProfileCompany = {
  id: number;
  companyId: number;
  userId: number;
  roleId: number;
  status: string;
  company: {
    id: number;
    name: string;
    email?: string | null;
    phone?: string | null;
  };
  role: {
    id: number;
    name: string;
  };
};

export type ProfileProject = {
  id: number;
  projectId: number;
  userId: number;
  roleId: number;
  status: string;
  project: {
    id: number;
    code: string;
    name: string;
    status: string;
    location?: string | null;
  };
  role: {
    id: number;
    name: string;
  };
};

export type ProfileUser = {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  jobTitle?: string | null;
  avatarUrl?: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  companyUsers: ProfileCompany[];
  projectUsers: ProfileProject[];
};

export type ProfileActivity = {
  id: number;
  action: string;
  module: string;
  entityName: string;
  entityId?: string | null;
  description?: string | null;
  createdAt: string;
  project?: {
    id: number;
    code: string;
    name: string;
  } | null;
};

export const profileApi = {
  getMe: async (): Promise<ProfileUser> => {
    const response = await api.get('/profile/me');
    return response.data;
  },

  updateMe: async (data: {
    name?: string;
    phone?: string;
    jobTitle?: string;
  }): Promise<ProfileUser> => {
    const response = await api.patch('/profile/me', data);
    return response.data;
  },

  changePassword: async (data: {
    currentPassword: string;
    newPassword: string;
  }) => {
    const response = await api.patch('/profile/change-password', data);
    return response.data;
  },

  getActivity: async (): Promise<ProfileActivity[]> => {
    const response = await api.get('/profile/activity');
    return response.data;
  },
  uploadAvatar: async (file: File): Promise<ProfileUser> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await api.post('/profile/avatar', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
},
};