import { companiesApi } from './companies.api';
import { projectsApi } from './projects.api';
import { rfisApi } from './rfis.api';
import { safetyApi } from './safety.api';
import { approvalsApi } from './approvals.api';
import { documentsApi } from './documents.api';

export type DashboardStats = {
  companies: number;
  projects: number;
  openRfis: number;
  pendingApprovals: number;
  safetyIncidents: number;
  documents: number;
};

export const dashboardApi = {
  getStats: async (): Promise<DashboardStats> => {
    const companies = await companiesApi.findAll();
    const projects = await projectsApi.findAll();

    let openRfis = 0;
    let safetyIncidents = 0;
    let documents = 0;

    for (const project of projects) {
      try {
        const [rfis, incidents, docs] = await Promise.all([
          rfisApi.findByProject(project.id),
          safetyApi.findIncidents(project.id),
          documentsApi.findByProject(project.id),
        ]);

        openRfis += rfis.filter((item) => item.status !== 'CLOSED').length;
        safetyIncidents += incidents.filter(
          (item) => item.status !== 'CLOSED',
        ).length;
        documents += docs.length;
      } catch {
        // Ignore project-level failures for dashboard summary
      }
    }

    let pendingApprovals = 0;

    try {
      const approvals = await approvalsApi.findMyPending();
      pendingApprovals = approvals.length;
    } catch {
      pendingApprovals = 0;
    }

    return {
      companies: companies.length,
      projects: projects.length,
      openRfis,
      pendingApprovals,
      safetyIncidents,
      documents,
    };
  },
};