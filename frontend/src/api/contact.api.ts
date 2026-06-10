import { api } from './client';

export type ContactPayload = {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  subject?: string;
  message: string;
};

export type ContactNotification = {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  company?: string | null;
  subject?: string | null;
  message: string;
  status: string;
  isRead: boolean;
  createdAt: string;
};

export const contactApi = {
  send: async (data: ContactPayload) => {
    const response = await api.post('/contact', data);
    return response.data;
  },

  notifications: async (): Promise<ContactNotification[]> => {
    const response = await api.get('/contact/notifications');
    return response.data;
  },

  unreadCount: async (): Promise<number> => {
    const response = await api.get('/contact/notifications/unread-count');
    return response.data;
  },

  markAsRead: async (id: number): Promise<ContactNotification> => {
    const response = await api.patch(`/contact/notifications/${id}/read`);
    return response.data;
  },
  remove: async (id: number): Promise<ContactNotification> => {
  const response = await api.delete(`/contact/notifications/${id}`);
  return response.data;
},
};