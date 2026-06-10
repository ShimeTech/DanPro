import { api } from './client';

export type DocumentType =
  | 'DRAWING'
  | 'RFI'
  | 'SUBMITTAL'
  | 'METHOD_STATEMENT'
  | 'INSPECTION_REQUEST'
  | 'CONTRACT'
  | 'REPORT'
  | 'OTHER';

export type DocumentStatus = 'WIP' | 'SHARED' | 'PUBLISHED' | 'ARCHIVED' | 'REJECTED';

export type DocumentVersion = {
  id: number;
  documentId: number;
  revision: string;
  status: DocumentStatus;
  fileName: string;
  filePath: string;
  fileSize?: number | null;
  mimeType?: string | null;
  notes?: string | null;
  createdAt?: string;
  uploadedBy?: {
    id: number;
    name: string;
    email: string;
    jobTitle?: string | null;
  } | null;  
};

export type ProjectDocument = {
  id: number;
  projectId: number;
  code: string;
  title: string;
  type: DocumentType;
  discipline?: string | null;
  originator?: string | null;
  rejectionReason?: string | null;
  zone?: string | null;
  level?: string | null;
  status: DocumentStatus;
  currentRevision?: string | null;
  description?: string | null;
  createdAt?: string;
  updatedAt?: string;
  project?: {
    id: number;
    code: string;
    name: string;
  };
  versions?: DocumentVersion[];
};

export type CreateDocumentPayload = {
  projectId: number;
  code: string;
  title: string;
  type: DocumentType;
  discipline?: string;
  originator?: string;
  zone?: string;
  level?: string;
  status?: DocumentStatus;
  currentRevision?: string;
  description?: string;
};
export type ChangeDocumentStatusPayload = {
  status: DocumentStatus;
  rejectionReason?: string;
};
export const documentsApi = {
  findByProject: async (projectId: number): Promise<ProjectDocument[]> => {
    const response = await api.get(`/documents/project/${projectId}`);
    return response.data;
  },

  findOne: async (id: number): Promise<ProjectDocument> => {
    const response = await api.get(`/documents/${id}`);
    return response.data;
  },

  create: async (data: CreateDocumentPayload): Promise<ProjectDocument> => {
    const response = await api.post('/documents', data);
    return response.data;
  },

  update: async (
    id: number,
    data: Partial<CreateDocumentPayload>,
  ): Promise<ProjectDocument> => {
    const response = await api.patch(`/documents/${id}`, data);
    return response.data;
  },

  archive: async (id: number): Promise<ProjectDocument> => {
    const response = await api.patch(`/documents/${id}/archive`);
    return response.data;
  },

changeStatus: async (
  id: number,
  data: ChangeDocumentStatusPayload,
): Promise<ProjectDocument> => {
  const response = await api.patch(`/documents/${id}/status`, data);
  return response.data;
},

uploadVersion: async (
  documentId: number,
  data: {
    file: File;
    revision?: string;
    status: DocumentStatus;
    notes?: string;
  },
): Promise<DocumentVersion> => {
  const formData = new FormData();
  formData.append('file', data.file);

  if (data.revision) {
    formData.append('revision', data.revision);
  }

  formData.append('status', data.status);
  formData.append('notes', data.notes ?? '');

  const response = await api.post(
    `/documents/${documentId}/upload-version`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    },
  );

  return response.data;
},

  getDownloadUrl: (versionId: number) =>
    `${api.defaults.baseURL}/documents/versions/${versionId}/download`,
};
