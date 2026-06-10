import { api } from './client';

export type InventoryTransactionType = 'RECEIVE' | 'ISSUE' | 'RETURN' | 'ADJUSTMENT';

export type Material = {
  id: number;
  companyId: number;
  code: string;
  name: string;
  unit: string;
  description?: string | null;
  minStock?: string | number | null;
  createdAt?: string;
  updatedAt?: string;
  company?: {
    id: number;
    name: string;
  };
};

export type InventoryTransaction = {
  id: number;
  projectId: number;
  materialId: number;
  type: InventoryTransactionType | string;
  quantity: string | number;
  unit: string;
  reference?: string | null;
  notes?: string | null;
  performedById?: number | null;
  createdAt: string;
  updatedAt?: string;
  material?: Material;
  project?: {
    id: number;
    code: string;
    name: string;
  };
  performedBy?: {
    id: number;
    name: string;
    email: string;
    jobTitle?: string | null;
  } | null;
};

export type ProjectStock = {
  materialId: number;
  code: string;
  name: string;
  unit: string;
  minStock?: number | null;
  received: number;
  issued: number;
  returned: number;
  adjusted: number;
  balance: number;
  isLowStock: boolean;
};

export type CreateMaterialPayload = {
  companyId: number;
  code: string;
  name: string;
  unit: string;
  description?: string;
  minStock?: number | string | null;
};

export type UpdateMaterialPayload = Partial<CreateMaterialPayload>;

export type CreateInventoryTransactionPayload = {
  projectId: number;
  materialId: number;
  type: InventoryTransactionType | string;
  quantity: number | string;
  unit?: string;
  reference?: string;
  notes?: string;
};

export type UpdateInventoryTransactionPayload = Partial<CreateInventoryTransactionPayload>;

export const inventoryApi = {
  createMaterial: async (data: CreateMaterialPayload): Promise<Material> => {
    const response = await api.post('/inventory/materials', data);
    return response.data;
  },

  findMaterials: async (companyId: number): Promise<Material[]> => {
    const response = await api.get(`/inventory/companies/${companyId}/materials`);
    return response.data;
  },

  findMaterial: async (id: number): Promise<Material> => {
    const response = await api.get(`/inventory/materials/${id}`);
    return response.data;
  },

  updateMaterial: async (id: number, data: UpdateMaterialPayload): Promise<Material> => {
    const response = await api.patch(`/inventory/materials/${id}`, data);
    return response.data;
  },

  removeMaterial: async (id: number): Promise<Material> => {
    const response = await api.delete(`/inventory/materials/${id}`);
    return response.data;
  },

  createTransaction: async (data: CreateInventoryTransactionPayload): Promise<InventoryTransaction> => {
    const response = await api.post('/inventory/transactions', data);
    return response.data;
  },

  findTransaction: async (id: number): Promise<InventoryTransaction> => {
    const response = await api.get(`/inventory/transactions/${id}`);
    return response.data;
  },

  findTransactionsByProject: async (projectId: number): Promise<InventoryTransaction[]> => {
    const response = await api.get(`/inventory/projects/${projectId}/transactions`);
    return response.data;
  },

  findTransactionsByMaterial: async (materialId: number): Promise<InventoryTransaction[]> => {
    const response = await api.get(`/inventory/materials/${materialId}/transactions`);
    return response.data;
  },

  updateTransaction: async (
    id: number,
    data: UpdateInventoryTransactionPayload,
  ): Promise<InventoryTransaction> => {
    const response = await api.patch(`/inventory/transactions/${id}`, data);
    return response.data;
  },

  removeTransaction: async (id: number): Promise<InventoryTransaction> => {
    const response = await api.delete(`/inventory/transactions/${id}`);
    return response.data;
  },

  getProjectStock: async (projectId: number): Promise<ProjectStock[]> => {
    const response = await api.get(`/inventory/projects/${projectId}/stock`);
    return response.data;
  },
};