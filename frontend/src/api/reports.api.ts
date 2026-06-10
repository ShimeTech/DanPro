// ============================================================
// FILE: src/api/reports.api.ts
// ============================================================
import { costApi } from './cost.api';
import { dashboardApi } from './dashboard.api';
import { financeApi } from './finance.api';
import { projectsApi } from './projects.api';
import type { Project } from './projects.api';

export type DashboardReport = {
  companies?: number;
  projects?: number;
  users?: number;
  openRfis?: number;
  pendingApprovals?: number;
  safetyIncidents?: number;
  documents?: number;
  [key: string]: unknown;
};

export type ProjectReport = {
  projectId: number;
  project: Project | null;
  costSummary: {
    projectId?: number;
    boqTotal: number;
    budgetTotal: number;
    approvedVariationTotal: number;
    revisedBudget: number;
    actualCost: number;
    remainingBudget: number;
    costPerformancePercent?: number;
  };
  cashFlow: {
    projectId?: number;
    invoicedAmount: number;
    receivedAmount: number;
    expenseAmount: number;
    retentionHeld: number;
    advanceDeducted: number;
    netCashFlow: number;
    outstandingReceivable: number;
  };
  generatedAt: string;
};

export type ExecutiveReport = {
  dashboardReport: DashboardReport;
  projects: Project[];
  selectedProjectReport: ProjectReport | null;
  generatedAt: string;
};

const emptyCostSummary: ProjectReport['costSummary'] = {
  boqTotal: 0,
  budgetTotal: 0,
  approvedVariationTotal: 0,
  revisedBudget: 0,
  actualCost: 0,
  remainingBudget: 0,
  costPerformancePercent: 0,
};

const emptyCashFlow: ProjectReport['cashFlow'] = {
  invoicedAmount: 0,
  receivedAmount: 0,
  expenseAmount: 0,
  retentionHeld: 0,
  advanceDeducted: 0,
  netCashFlow: 0,
  outstandingReceivable: 0,
};

async function safeRequest<T>(request: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await request();
  } catch (error) {
    console.error('[Reports API] Request failed:', error);
    return fallback;
  }
}

function normalizeNumber(value: unknown): number {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function normalizeCostSummary(data: any): ProjectReport['costSummary'] {
  return {
    projectId: data?.projectId,
    boqTotal: normalizeNumber(data?.boqTotal),
    budgetTotal: normalizeNumber(data?.budgetTotal),
    approvedVariationTotal: normalizeNumber(data?.approvedVariationTotal),
    revisedBudget: normalizeNumber(data?.revisedBudget),
    actualCost: normalizeNumber(data?.actualCost),
    remainingBudget: normalizeNumber(data?.remainingBudget),
    costPerformancePercent: normalizeNumber(data?.costPerformancePercent),
  };
}

function normalizeCashFlow(data: any): ProjectReport['cashFlow'] {
  return {
    projectId: data?.projectId,
    invoicedAmount: normalizeNumber(data?.invoicedAmount),
    receivedAmount: normalizeNumber(data?.receivedAmount),
    expenseAmount: normalizeNumber(data?.expenseAmount),
    retentionHeld: normalizeNumber(data?.retentionHeld),
    advanceDeducted: normalizeNumber(data?.advanceDeducted),
    netCashFlow: normalizeNumber(data?.netCashFlow),
    outstandingReceivable: normalizeNumber(data?.outstandingReceivable),
  };
}

export const reportsApi = {
  getDashboardReport: async (): Promise<DashboardReport> => {
    return safeRequest(() => dashboardApi.getStats(), {});
  },

  getProjects: async (): Promise<Project[]> => {
    return safeRequest(() => projectsApi.findAll(), []);
  },

  getProjectReport: async (projectId: number): Promise<ProjectReport> => {
    if (!projectId || Number.isNaN(Number(projectId))) {
      throw new Error('Valid projectId is required to generate project report');
    }

    const projectsPromise = safeRequest(() => projectsApi.findAll(), []);
    const costSummaryPromise = safeRequest(() => costApi.getSummary(projectId), emptyCostSummary);
    const cashFlowPromise = safeRequest(() => financeApi.getCashFlow(projectId), emptyCashFlow);

    const [projects, costSummary, cashFlow] = await Promise.all([
      projectsPromise,
      costSummaryPromise,
      cashFlowPromise,
    ]);

    const project = projects.find((item) => item.id === Number(projectId)) ?? null;

    return {
      projectId: Number(projectId),
      project,
      costSummary: normalizeCostSummary(costSummary),
      cashFlow: normalizeCashFlow(cashFlow),
      generatedAt: new Date().toISOString(),
    };
  },

  getExecutiveReport: async (projectId?: number): Promise<ExecutiveReport> => {
    const [dashboardReport, projects] = await Promise.all([
      reportsApi.getDashboardReport(),
      reportsApi.getProjects(),
    ]);

    const selectedProjectId = projectId ?? projects[0]?.id;
    const selectedProjectReport = selectedProjectId
      ? await reportsApi.getProjectReport(selectedProjectId)
      : null;

    return {
      dashboardReport,
      projects,
      selectedProjectReport,
      generatedAt: new Date().toISOString(),
    };
  },
};
