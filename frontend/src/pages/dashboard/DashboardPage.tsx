import { useEffect, useState } from 'react';
import { dashboardApi } from '../../api/dashboard.api';
import type { DashboardStats } from '../../api/dashboard.api';
import { Card, DataTable, PageHeader } from '../../components/ui';

type Activity = {
  module: string;
  description: string;
  status: string;
};

const initialStats: DashboardStats = {
  companies: 0,
  projects: 0,
  openRfis: 0,
  pendingApprovals: 0,
  safetyIncidents: 0,
  documents: 0,
};

const activities: Activity[] = [
  {
    module: 'Projects',
    description: 'Project management module connected',
    status: 'Active',
  },
  {
    module: 'Documents',
    description: 'Document control and upload system ready',
    status: 'Active',
  },
  {
    module: 'Quality',
    description: 'Quality inspections and NCR workflow enabled',
    status: 'Active',
  },
  {
    module: 'Finance',
    description: 'Invoices, payments, and cash flow tracking enabled',
    status: 'Active',
  },
];

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>(initialStats);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  async function loadDashboard() {
    try {
      setLoading(true);
      setMessage('');

      const data = await dashboardApi.getStats();
      setStats(data);
    } catch (error: any) {
      setMessage(error.response?.data?.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  const statCards = [
    {
      title: 'Companies',
      value: stats.companies,
      description: 'Registered organizations',
    },
    {
      title: 'Projects',
      value: stats.projects,
      description: 'Total construction projects',
    },
    {
      title: 'Open RFIs',
      value: stats.openRfis,
      description: 'Unclosed information requests',
    },
    {
      title: 'Pending Approvals',
      value: stats.pendingApprovals,
      description: 'Waiting for review',
    },
    {
      title: 'Safety Incidents',
      value: stats.safetyIncidents,
      description: 'Open safety records',
    },
    {
      title: 'Documents',
      value: stats.documents,
      description: 'Controlled project documents',
    },
  ];

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Enterprise overview of BuildPro IMS project operations."
      />

      {message && (
        <div
          style={{
            marginBottom: 16,
            padding: 12,
            borderRadius: 10,
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#991b1b',
          }}
        >
          {message}
        </div>
      )}

      {loading && <p>Loading dashboard...</p>}

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: 16,
          marginBottom: 24,
        }}
      >
        {statCards.map((item) => (
          <Card key={item.title}>
            <p
              style={{
                margin: 0,
                color: '#6b7280',
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              {item.title}
            </p>

            <h2
              style={{
                margin: '10px 0',
                fontSize: 34,
                lineHeight: 1,
                color: '#111827',
              }}
            >
              {item.value}
            </h2>

            <p style={{ margin: 0, color: '#6b7280', fontSize: 13 }}>
              {item.description}
            </p>
          </Card>
        ))}
      </section>

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 2fr) minmax(280px, 1fr)',
          gap: 16,
        }}
        className="dashboard-grid"
      >
        <Card title="Operational Modules">
          <DataTable<Activity>
            columns={[
              {
                header: 'Module',
                accessor: 'module',
              },
              {
                header: 'Description',
                accessor: 'description',
              },
              {
                header: 'Status',
                accessor: (row) => (
                  <span
                    style={{
                      color: '#15803d',
                      fontWeight: 700,
                    }}
                  >
                    {row.status}
                  </span>
                ),
              },
            ]}
            data={activities}
          />
        </Card>

        <Card title="System Health">                 
       <div className="module-sidebar">
            <StatusItem label="Backend API" value="Connected" />
            <StatusItem label="Authentication" value="JWT Enabled" />
            <StatusItem label="Authorization" value="RBAC Ready" />
            <StatusItem label="Document Upload" value="Active" />
            <StatusItem label="Audit Logging" value="Active" />
            <StatusItem label="Database" value="MySQL + Prisma" />
          </div>
        </Card>
      </section>
    </div>
  );
}

function StatusItem({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: 12,
        borderBottom: '1px solid #f3f4f6',
        paddingBottom: 10,
        fontSize: 14,
      }}
    >
      <span style={{ color: '#374151' }}>{label}</span>
      <strong style={{ color: '#111827', textAlign: 'right' }}>{value}</strong>
    </div>
  );
}