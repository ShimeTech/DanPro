import { api } from './client';

export type IncidentSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type IncidentStatus = 'OPEN' | 'INVESTIGATING' | 'CLOSED';
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | string;

export type SafetyIncident = {
  id: number;
  projectId: number;
  code: string;
  title: string;
  description: string;
  severity: IncidentSeverity | string;
  status: IncidentStatus | string;
  incidentDate: string;
  location?: string | null;
  correctiveAction?: string | null;
  closedAt?: string | null;
  reporterId?: number | null;
  createdAt?: string;
  updatedAt?: string;
  reporter?: {
    id: number;
    name: string;
    email: string;
    jobTitle?: string | null;
  } | null;
};

export type RiskAssessment = {
  id: number;
  projectId: number;
  code: string;
  activity: string;
  hazards: string;
  risks: string;
  controls?: string | null;
  riskLevel?: RiskLevel | null;
  reviewDate?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type ToolboxTalkAttendee = {
  name: string;
  role?: string;
  signature?: string;
};

export type ToolboxTalk = {
  id: number;
  projectId: number;
  topic: string;
  talkDate: string;
  attendees?: ToolboxTalkAttendee[];
  remarks?: string | null;
  leaderId?: number | null;
  createdAt?: string;
  updatedAt?: string;
  leader?: {
    id: number;
    name: string;
    email: string;
    jobTitle?: string | null;
  } | null;
};

export type SafetyInspection = {
  id: number;
  projectId: number;
  code: string;
  inspectionDate: string;
  findings?: string | null;
  actions?: string | null;
  inspectorId?: number | null;
  createdAt?: string;
  updatedAt?: string;
  inspector?: {
    id: number;
    name: string;
    email: string;
    jobTitle?: string | null;
  } | null;
};

export type CreateIncidentPayload = {
  projectId: number;
  code: string;
  title: string;
  description: string;
  severity?: IncidentSeverity | string;
  status?: IncidentStatus | string;
  incidentDate: string;
  location?: string;
  correctiveAction?: string;
};

export type CreateRiskAssessmentPayload = {
  projectId: number;
  code: string;
  activity: string;
  hazards: string;
  risks: string;
  controls?: string;
  riskLevel?: string;
  reviewDate?: string;
};

export type CreateToolboxTalkPayload = {
  projectId: number;
  topic: string;
  talkDate: string;
  attendees?: ToolboxTalkAttendee[];
  leaderId?: number | null;
  remarks?: string;
};

export type CreateSafetyInspectionPayload = {
  projectId: number;
  code: string;
  inspectionDate: string;
  findings?: string;
  actions?: string;
  inspectorId?: number | null;
};

export const safetyApi = {
  createIncident: async (data: CreateIncidentPayload): Promise<SafetyIncident> => {
    const response = await api.post('/safety/incidents', data);
    return response.data;
  },

  findIncidents: async (projectId: number): Promise<SafetyIncident[]> => {
    const response = await api.get(`/safety/projects/${projectId}/incidents`);
    return response.data;
  },

  findIncident: async (id: number): Promise<SafetyIncident> => {
    const response = await api.get(`/safety/incidents/${id}`);
    return response.data;
  },

  updateIncident: async (
    id: number,
    data: Partial<CreateIncidentPayload>,
  ): Promise<SafetyIncident> => {
    const response = await api.patch(`/safety/incidents/${id}`, data);
    return response.data;
  },

  closeIncident: async (id: number): Promise<SafetyIncident> => {
    const response = await api.patch(`/safety/incidents/${id}/close`);
    return response.data;
  },

  reopenIncident: async (id: number): Promise<SafetyIncident> => {
    const response = await api.patch(`/safety/incidents/${id}/reopen`);
    return response.data;
  },

  removeIncident: async (id: number): Promise<SafetyIncident> => {
    const response = await api.delete(`/safety/incidents/${id}`);
    return response.data;
  },

  createRiskAssessment: async (
    data: CreateRiskAssessmentPayload,
  ): Promise<RiskAssessment> => {
    const response = await api.post('/safety/risk-assessments', data);
    return response.data;
  },

  findRiskAssessments: async (projectId: number): Promise<RiskAssessment[]> => {
    const response = await api.get(`/safety/projects/${projectId}/risk-assessments`);
    return response.data;
  },

  findRiskAssessment: async (id: number): Promise<RiskAssessment> => {
    const response = await api.get(`/safety/risk-assessments/${id}`);
    return response.data;
  },

  updateRiskAssessment: async (
    id: number,
    data: Partial<CreateRiskAssessmentPayload>,
  ): Promise<RiskAssessment> => {
    const response = await api.patch(`/safety/risk-assessments/${id}`, data);
    return response.data;
  },

  removeRiskAssessment: async (id: number): Promise<RiskAssessment> => {
    const response = await api.delete(`/safety/risk-assessments/${id}`);
    return response.data;
  },

  createToolboxTalk: async (data: CreateToolboxTalkPayload): Promise<ToolboxTalk> => {
    const response = await api.post('/safety/toolbox-talks', data);
    return response.data;
  },

  findToolboxTalks: async (projectId: number): Promise<ToolboxTalk[]> => {
    const response = await api.get(`/safety/projects/${projectId}/toolbox-talks`);
    return response.data;
  },

  findToolboxTalk: async (id: number): Promise<ToolboxTalk> => {
    const response = await api.get(`/safety/toolbox-talks/${id}`);
    return response.data;
  },

  updateToolboxTalk: async (
    id: number,
    data: Partial<CreateToolboxTalkPayload>,
  ): Promise<ToolboxTalk> => {
    const response = await api.patch(`/safety/toolbox-talks/${id}`, data);
    return response.data;
  },

  removeToolboxTalk: async (id: number): Promise<ToolboxTalk> => {
    const response = await api.delete(`/safety/toolbox-talks/${id}`);
    return response.data;
  },

  createSafetyInspection: async (
    data: CreateSafetyInspectionPayload,
  ): Promise<SafetyInspection> => {
    const response = await api.post('/safety/inspections', data);
    return response.data;
  },

  findSafetyInspections: async (projectId: number): Promise<SafetyInspection[]> => {
    const response = await api.get(`/safety/projects/${projectId}/inspections`);
    return response.data;
  },

  findSafetyInspection: async (id: number): Promise<SafetyInspection> => {
    const response = await api.get(`/safety/inspections/${id}`);
    return response.data;
  },

  updateSafetyInspection: async (
    id: number,
    data: Partial<CreateSafetyInspectionPayload>,
  ): Promise<SafetyInspection> => {
    const response = await api.patch(`/safety/inspections/${id}`, data);
    return response.data;
  },

  removeSafetyInspection: async (id: number): Promise<SafetyInspection> => {
    const response = await api.delete(`/safety/inspections/${id}`);
    return response.data;
  },
};