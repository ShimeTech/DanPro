import { useEffect, useState } from 'react';
import { auditApi } from '../../api/audit.api';
import type { AuditLog } from '../../api/audit.api';
import { projectsApi } from '../../api/projects.api';
import type { Project } from '../../api/projects.api';
import { Button, Card, DataTable, PageHeader } from '../../components/ui';

export default function AuditLogsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | ''>('');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  async function loadInitialData() {
    try {
      setLoading(true);

      const [projectData, logData] = await Promise.all([
        projectsApi.findAll(),
        auditApi.findAll(),
      ]);

      setProjects(projectData);
      setLogs(logData);
    } catch (error: any) { 
      setMessage(error.response?.data?.message || 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }

  async function handleProjectFilter(value: string) {
    try {
      setLoading(true);
      setMessage('');

      if (!value) {
        setSelectedProjectId('');
        const data = await auditApi.findAll();
        setLogs(data);
        return;
      }

      const projectId = Number(value);
      setSelectedProjectId(projectId);

      const data = await auditApi.findByProject(projectId);
      setLogs(data);
    } catch (error: any) {
      setMessage(error.response?.data?.message || 'Failed to filter audit logs');
    } finally {
      setLoading(false);
    }
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(logs, null, 2)], {
      type: 'application/json',
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = `audit-logs-${new Date().toISOString()}.json`;
    link.click();

    URL.revokeObjectURL(url);
  }

  useEffect(() => {
    loadInitialData();
  }, []);


  async function deleteLog(id: number) {
  if (!window.confirm('Delete this audit log?')) return;

  try {
    await auditApi.remove(id);
    setLogs((prev) => prev.filter((log) => log.id !== id));

    if (selectedLog?.id === id) {
      setSelectedLog(null);
    }
  } catch (error: any) {
    setMessage(error.response?.data?.message || 'Failed to delete audit log');
  }
}

  return (
    <div>
      <PageHeader
        title="Audit Logs"
        description="Track user actions, system changes, approvals, updates, and deletions."
        actionLabel="Export JSON"
        onAction={exportJson}
      />

      {message && (
        <div
          style={{
            marginBottom: 16,
            padding: 12,
            background: '#f9fafb',
            border: '1px solid #e5e7eb',
            borderRadius: 8,
          }}
        >
          {message}
        </div>
      )}

      {loading && <p>Loading audit logs...</p>}

      <div className="module-grid">
        <div className="module-sidebar">
          <Card title="Filter Logs">
            <SelectField
              label="Project"
              value={selectedProjectId}
              onChange={handleProjectFilter}
            >
              <option value="">All projects</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.code} - {project.name}
                </option>
              ))}
            </SelectField>

            <Button style={{ width: '100%' }} onClick={loadInitialData}>
              Refresh Logs
            </Button>
          </Card>

          <Card title="Selected Log Details">
            {selectedLog ? (
              <div style={{ display: 'grid', gap: 10 }}>
                <InfoItem label="ID" value={`#${selectedLog.id}`} />
                <InfoItem label="Action" value={selectedLog.action} />
                <InfoItem label="Module" value={selectedLog.module} />
                <InfoItem label="Entity" value={selectedLog.entityName} />
                <InfoItem label="Entity ID" value={selectedLog.entityId || '-'} />
                <InfoItem
                  label="User"
                  value={selectedLog.user?.name || String(selectedLog.userId || '-')}
                />
                <InfoItem
                  label="Project"
                  value={selectedLog.project?.name || String(selectedLog.projectId || '-')}
                />
                <InfoItem label="Created" value={formatDateTime(selectedLog.createdAt)} />

                <div>
                  <strong>Description</strong>
                  <p style={{ color: '#6b7280' }}>
                    {selectedLog.description || '-'}
                  </p>
                </div>

                <details>
                  <summary style={{ cursor: 'pointer', fontWeight: 700 }}>
                    Old Data
                  </summary>
                  <pre style={preStyle}>{JSON.stringify(selectedLog.oldData, null, 2)}</pre>
                </details>

                <details>
                  <summary style={{ cursor: 'pointer', fontWeight: 700 }}>
                    New Data
                  </summary>
                  <pre style={preStyle}>{JSON.stringify(selectedLog.newData, null, 2)}</pre>
                </details>
              </div>
            ) : (
              <p>Select a log from the table to view details.</p>
            )}
          </Card>
        </div>

        <div className="module-content">
          <Card title="Audit Log List">
            <DataTable<AuditLog>
              columns={[
                {
                  header: 'Date',
                  accessor: (row) => formatDateTime(row.createdAt),
                },
                {
                  header: 'User',
                  accessor: (row) => row.user?.name || row.userId || '-',
                },
                {
                  header: 'Action',
                  accessor: 'action',
                },
                {
                  header: 'Module',
                  accessor: 'module',
                },
                {
                  header: 'Entity',
                  accessor: (row) =>
                    `${row.entityName}${row.entityId ? ` #${row.entityId}` : ''}`,
                },
                {
                  header: 'Project',
                  accessor: (row) => row.project?.name || row.projectId || '-',
                },
                {
                  header: 'Description',
                  accessor: (row) => truncate(row.description),
                },
{
  header: 'Actions',
  accessor: (row) => (
    <div style={{ display: 'flex', gap: 8 }}>
      <Button
        type="button"
        variant="secondary"
        onClick={() => setSelectedLog(row)}
      >
        View
      </Button>

      <Button
        type="button"
        variant="danger"
        onClick={() => deleteLog(row.id)}
      >
        Delete
      </Button>
    </div>
  ),
}
              ]}
              data={logs}
              emptyMessage="No audit logs found"
            />
          </Card>
        </div>
      </div>
    </div>
  );
}

const preStyle: React.CSSProperties = {
  background: '#111827',
  color: '#e5e7eb',
  padding: 12,
  borderRadius: 8,
  overflowX: 'auto',
  fontSize: 12,
};

function SelectField({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>
        {label}
      </label>

      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%',
          padding: '10px 12px',
          borderRadius: 8,
          border: '1px solid #d1d5db',
        }}
      >
        {children}
      </select>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: 12,
        borderBottom: '1px solid #f3f4f6',
        paddingBottom: 8,
      }}
    >
      <span>{label}</span>
      <strong style={{ textAlign: 'right' }}>{value}</strong>
    </div>
  );
}

function formatDateTime(value?: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleString();
}

function truncate(value?: string | null) {
  if (!value) return '-';
  return value.length > 70 ? `${value.slice(0, 70)}...` : value;
}