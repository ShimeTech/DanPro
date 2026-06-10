import { api } from './client';

export type RegisterPayload = {
  name: string;
  email: string;
  password: string;
  phone?: string;
  jobTitle?: string;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type LoginResponse = {
  message: string;
  accessToken: string;
  user: {
    id: number;
    name: string;
    email: string;
    phone?: string | null;
    jobTitle?: string | null;
    status: string;
  };
};

export type AuthCompany = {
  id: number;
  name: string;
  role: string;
};

export type AuthProject = {
  id: number;
  code: string;
  name: string;
  role: string;
};

export type AuthMe = {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  jobTitle?: string | null;
  avatarUrl?: string | null;
  status: string;
  companies: AuthCompany[];
  projects: AuthProject[];
  permissions: string[];
};

export const authApi = {
  register: async (data: RegisterPayload): Promise<LoginResponse> => {
    const response = await api.post('/auth/register', data);
    return response.data;
  },

  login: async (data: LoginPayload): Promise<LoginResponse> => {
    const response = await api.post('/auth/login', data);
    return response.data;
  },

  me: async (): Promise<AuthMe> => {
    const response = await api.get('/auth/me');
    return response.data;
  },
};