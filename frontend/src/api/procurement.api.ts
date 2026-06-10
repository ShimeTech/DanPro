import { api } from './client';

export type ProcurementStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'ISSUED'
  | 'CANCELLED'
  | 'CLOSED';

export type Supplier = {
  id: number;
  companyId: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  taxNumber?: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  company?: {
    id: number;
    name: string;
  };
};

export type PurchaseItem = {
  id?: number;
  materialId?: number | null;
  description: string;
  quantity: number;
  unit: string;
  unitPrice?: number | string | null;
  totalPrice?: number | string | null;
};

export type PurchaseRequest = {
  id: number;
  projectId: number;
  code: string;
  description?: string | null;
  status: ProcurementStatus | string;
  requestedDate?: string | null;
  requestedById?: number | null;
  createdAt?: string;
  updatedAt?: string;
  items?: PurchaseItem[];
  project?: {
    id: number;
    code: string;
    name: string;
  };
  requestedBy?: {
    id: number;
    name: string;
    email: string;
    jobTitle?: string | null;
  } | null;
};

export type PurchaseOrder = {
  id: number;
  projectId: number;
  supplierId?: number | null;
  code: string;
  description?: string | null;
  status: ProcurementStatus | string;
  orderDate?: string | null;
  totalAmount?: string | number | null;
  createdAt?: string;
  updatedAt?: string;
  supplier?: Supplier | null;
  items?: PurchaseItem[];
  project?: {
    id: number;
    code: string;
    name: string;
  };
  createdBy?: {
    id: number;
    name: string;
    email: string;
    jobTitle?: string | null;
  } | null;
};

export type CreateSupplierPayload = {
  companyId: number;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  taxNumber?: string;
  isActive?: boolean;
};

export type CreatePurchaseRequestPayload = {
  projectId: number;
  code: string;
  description?: string;
  status?: ProcurementStatus | string;
  requestedDate?: string;
  items?: PurchaseItem[];
};

export type CreatePurchaseOrderPayload = {
  projectId: number;
  supplierId?: number | null;
  code: string;
  description?: string;
  status?: ProcurementStatus | string;
  orderDate?: string;
  totalAmount?: number | string | null;
  items?: PurchaseItem[];
};

export const procurementApi = {
  createSupplier: async (data: CreateSupplierPayload): Promise<Supplier> => {
    const response = await api.post('/procurement/suppliers', data);
    return response.data;
  },

  findSuppliers: async (companyId: number): Promise<Supplier[]> => {
    const response = await api.get(`/procurement/companies/${companyId}/suppliers`);
    return response.data;
  },

  findSupplier: async (id: number): Promise<Supplier> => {
    const response = await api.get(`/procurement/suppliers/${id}`);
    return response.data;
  },

  updateSupplier: async (
    id: number,
    data: Partial<CreateSupplierPayload>,
  ): Promise<Supplier> => {
    const response = await api.patch(`/procurement/suppliers/${id}`, data);
    return response.data;
  },

  activateSupplier: async (id: number): Promise<Supplier> => {
    const response = await api.patch(`/procurement/suppliers/${id}/activate`);
    return response.data;
  },

  deactivateSupplier: async (id: number): Promise<Supplier> => {
    const response = await api.patch(`/procurement/suppliers/${id}/deactivate`);
    return response.data;
  },

  removeSupplier: async (id: number): Promise<Supplier> => {
    const response = await api.delete(`/procurement/suppliers/${id}`);
    return response.data;
  },

  createPurchaseRequest: async (
    data: CreatePurchaseRequestPayload,
  ): Promise<PurchaseRequest> => {
    const response = await api.post('/procurement/purchase-requests', data);
    return response.data;
  },

  findPurchaseRequests: async (projectId: number): Promise<PurchaseRequest[]> => {
    const response = await api.get(`/procurement/projects/${projectId}/purchase-requests`);
    return response.data;
  },

  findPurchaseRequest: async (id: number): Promise<PurchaseRequest> => {
    const response = await api.get(`/procurement/purchase-requests/${id}`);
    return response.data;
  },

  updatePurchaseRequest: async (
    id: number,
    data: Partial<CreatePurchaseRequestPayload>,
  ): Promise<PurchaseRequest> => {
    const response = await api.patch(`/procurement/purchase-requests/${id}`, data);
    return response.data;
  },

  submitPurchaseRequest: async (id: number): Promise<PurchaseRequest> => {
    const response = await api.patch(`/procurement/purchase-requests/${id}/submit`);
    return response.data;
  },

  approvePurchaseRequest: async (id: number): Promise<PurchaseRequest> => {
    const response = await api.patch(`/procurement/purchase-requests/${id}/approve`);
    return response.data;
  },

  rejectPurchaseRequest: async (id: number): Promise<PurchaseRequest> => {
    const response = await api.patch(`/procurement/purchase-requests/${id}/reject`);
    return response.data;
  },

  removePurchaseRequest: async (id: number): Promise<PurchaseRequest> => {
    const response = await api.delete(`/procurement/purchase-requests/${id}`);
    return response.data;
  },

  createPurchaseOrder: async (data: CreatePurchaseOrderPayload): Promise<PurchaseOrder> => {
    const response = await api.post('/procurement/purchase-orders', data);
    return response.data;
  },

  findPurchaseOrders: async (projectId: number): Promise<PurchaseOrder[]> => {
    const response = await api.get(`/procurement/projects/${projectId}/purchase-orders`);
    return response.data;
  },

  findPurchaseOrder: async (id: number): Promise<PurchaseOrder> => {
    const response = await api.get(`/procurement/purchase-orders/${id}`);
    return response.data;
  },

  updatePurchaseOrder: async (
    id: number,
    data: Partial<CreatePurchaseOrderPayload>,
  ): Promise<PurchaseOrder> => {
    const response = await api.patch(`/procurement/purchase-orders/${id}`, data);
    return response.data;
  },

  issuePurchaseOrder: async (id: number): Promise<PurchaseOrder> => {
    const response = await api.patch(`/procurement/purchase-orders/${id}/issue`);
    return response.data;
  },

  closePurchaseOrder: async (id: number): Promise<PurchaseOrder> => {
    const response = await api.patch(`/procurement/purchase-orders/${id}/close`);
    return response.data;
  },

  cancelPurchaseOrder: async (id: number): Promise<PurchaseOrder> => {
    const response = await api.patch(`/procurement/purchase-orders/${id}/cancel`);
    return response.data;
  },

  removePurchaseOrder: async (id: number): Promise<PurchaseOrder> => {
    const response = await api.delete(`/procurement/purchase-orders/${id}`);
    return response.data;
  },
};
