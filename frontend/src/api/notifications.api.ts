import { api } from './client';

export type NotificationType =
  | 'INFO'
  | 'SUCCESS'
  | 'WARNING'
  | 'ERROR'
  | 'APPROVAL'
  | 'DEADLINE';

export type NotificationItem = {
  id: number;
  userId: number;
  projectId?: number | null;
  type: NotificationType | string;
  title: string;
  message: string;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
  updatedAt?: string;
  project?: {
    id: number;
    code: string;
    name: string;
  } | null;
  user?: {
    id: number;
    name: string;
    email: string;
  } | null;
};

export type CreateNotificationPayload = {
  userId: number;
  projectId?: number | null;
  type?: NotificationType | string;
  title: string;
  message: string;
  isRead?: boolean;
};

export type UpdateNotificationPayload = Partial<CreateNotificationPayload>;

export const notificationsApi = {
  findMine: async (): Promise<NotificationItem[]> => {
    const response = await api.get('/notifications');
    return response.data;
  },

  findAll: async (): Promise<NotificationItem[]> => {
    const response = await api.get('/notifications/all');
    return response.data;
  },

  findByUser: async (userId: number): Promise<NotificationItem[]> => {
    const response = await api.get(`/notifications/users/${userId}`);
    return response.data;
  },

  findByProject: async (projectId: number): Promise<NotificationItem[]> => {
    const response = await api.get(`/notifications/projects/${projectId}`);
    return response.data;
  },

  findOne: async (id: number): Promise<NotificationItem> => {
    const response = await api.get(`/notifications/${id}`);
    return response.data;
  },

  create: async (data: CreateNotificationPayload): Promise<NotificationItem> => {
    const response = await api.post('/notifications', data);
    return response.data;
  },

  update: async (id: number, data: UpdateNotificationPayload): Promise<NotificationItem> => {
    const response = await api.patch(`/notifications/${id}`, data);
    return response.data;
  },

  markAsRead: async (id: number): Promise<NotificationItem> => {
    const response = await api.patch(`/notifications/${id}/read`);
    return response.data;
  },

  markAsUnread: async (id: number): Promise<NotificationItem> => {
    const response = await api.patch(`/notifications/${id}/unread`);
    return response.data;
  },

  markAllAsRead: async (): Promise<{ count: number }> => {
    const response = await api.patch('/notifications/read-all');
    return response.data;
  },

  remove: async (id: number): Promise<NotificationItem> => {
    const response = await api.delete(`/notifications/${id}`);
    return response.data;
  },
};
