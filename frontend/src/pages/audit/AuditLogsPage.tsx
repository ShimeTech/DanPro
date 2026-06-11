import { useEffect, useState } from 'react';
import { Eye, RefreshCcw, Trash2 } from 'lucide-react';

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

  const [pageLoading, setPageLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState('');

  const isSuccess = message.toLowerCase().includes('successfully');

  useEffect(() => {
    loadInitialData();
  }, []);

  async function loadInitialData() {
    try {
      setPageLoading(true);
      setMessage('');

      const [projectData, logData] = await Promise.all([
        projectsApi.findAll(),
        auditApi.findAll(),
      ]);

      setProjects(projectData);
      setLogs(logData);
      setSelectedProjectId('');
      setSelectedLog(null);
    } catch (error: any) {
      setMessage(getErrorMessage(error, 'Failed to load audit logs'));
    } finally {
      setPageLoading(false);
    }
  }

  async function loadLogs(projectId?: number) {
    const data = projectId
      ? await auditApi.findByProject(projectId)
      : await auditApi.findAll();

    setLogs(data);
  }

  async function handleProjectFilter(value: string) {
    try {
      setActionLoading(true);
      setMessage('');

      if (!value) {
        setSelectedProjectId('');
        await loadLogs();
        return;
      }

      const projectId = Number(value);

      setSelectedProjectId(projectId);
      await loadLogs(projectId);
    } catch (error: any) {
      setMessage(getErrorMessage(error, 'Failed to filter audit logs'));
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRefresh() {
    try {
      setActionLoading(true);
      setMessage('');

      await loadLogs(selectedProjectId ? Number(selectedProjectId) : undefined);

      setMessage('Audit logs refreshed successfully');
    } catch (error: any) {
      setMessage(getErrorMessage(error, 'Failed to refresh audit logs'));
    } finally {
      setActionLoading(false);
    }
  }

  async function deleteLog(id: number) {
    if (!window.confirm('Delete this audit log?')) return;

    try {
      setActionLoading(true);
      setMessage('');

      await auditApi.remove(id);

      setLogs((prev) => prev.filter((log) => log.id !== id));

      if (selectedLog?.id === id) {
        setSelectedLog(null);
      }

      setMessage('Audit log deleted successfully');
    } catch (error: any) {
      setMessage(getErrorMessage(error, 'Failed to delete audit log'));
    } finally {
      setActionLoading(false);
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

  return (
    <div>
      <PageHeader
        title="Audit Logs"
        description="Track user actions, system changes, approvals, updates, and deletions."
        actionLabel="Export JSON"
        onAction={exportJson}
      />

      {message && <Alert type={isSuccess ? 'success' : 'error'}>{message}</Alert>}

      {pageLoading ? (
        <AuditLogsLoading />
      ) : (
        <div className="module-grid">
          <div className="module-sidebar">
            <Card title="Filter Logs">
              <SelectField
                label="Project"
                value={selectedProjectId}
                disabled={actionLoading}
                onChange={handleProjectFilter}
              >
                <option value="">All projects</option>

                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.code} - {project.name}
                  </option>
                ))}
              </SelectField>

              <Button
                style={{ width: '100%' }}
                onClick={handleRefresh}
                disabled={actionLoading}
              >
                {actionLoading ? 'Refreshing...' : (
                  <>
                    <RefreshCcw size={15} /> Refresh Logs
                  </>
                )}
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
                    value={
                      selectedLog.project?.name ||
                      String(selectedLog.projectId || '-')
                    }
                  />
                  <InfoItem
                    label="Created"
                    value={formatDateTime(selectedLog.createdAt)}
                  />

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
                    <pre style={preStyle}>
                      {JSON.stringify(selectedLog.oldData, null, 2)}
                    </pre>
                  </details>

                  <details>
                    <summary style={{ cursor: 'pointer', fontWeight: 700 }}>
                      New Data
                    </summary>
                    <pre style={preStyle}>
                      {JSON.stringify(selectedLog.newData, null, 2)}
                    </pre>
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
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <Button
                          type="button"
                          variant="secondary"
                          disabled={actionLoading}
                          onClick={() => setSelectedLog(row)}
                        >
                          <Eye size={15} /> View
                        </Button>

                        <Button
                          type="button"
                          variant="danger"
                          disabled={actionLoading}
                          onClick={() => deleteLog(row.id)}
                        >
                          <Trash2 size={15} /> Delete
                        </Button>
                      </div>
                    ),
                  },
                ]}
                data={logs}
                emptyMessage="No audit logs found"
              />
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

function AuditLogsLoading() {
  return (
    <div role="status" aria-live="polite" aria-busy="true">
      <Card>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: 20,
          }}
        >
          <span
            style={{
              width: 24,
              height: 24,
              border: '3px solid #e5e7eb',
              borderTopColor: '#2563eb',
              borderRadius: '50%',
              display: 'inline-block',
              animation: 'audit-spin 0.8s linear infinite',
            }}
          />

          <div>
            <strong style={{ color: '#111827' }}>Loading audit logs</strong>

            <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: 14 }}>
              Retrieving system activity, user actions, project changes, old data,
              new data, and audit history from the server.
            </p>
          </div>
        </div>

        <div className="module-grid">
          <div className="module-sidebar">
            {Array.from({ length: 2 }).map((_, cardIndex) => (
              <div
                key={cardIndex}
                style={{
                  minHeight: cardIndex === 0 ? 170 : 430,
                  padding: 18,
                  marginBottom: 16,
                  borderRadius: 14,
                  background: '#ffffff',
                  border: '1px solid #e5e7eb',
                }}
              >
                <Skeleton width="170px" height={18} />

                {Array.from({ length: cardIndex === 0 ? 3 : 9 }).map(
                  (_, index) => (
                    <Skeleton
                      key={index}
                      width="100%"
                      height={32}
                      marginTop={18}
                    />
                  ),
                )}
              </div>
            ))}
          </div>

          <div
            style={{
              minHeight: 620,
              padding: 18,
              borderRadius: 14,
              background: '#ffffff',
              border: '1px solid #e5e7eb',
            }}
          >
            <Skeleton width="170px" height={18} />

            {Array.from({ length: 10 }).map((_, index) => (
              <Skeleton
                key={index}
                width="100%"
                height={30}
                marginTop={20}
              />
            ))}
          </div>
        </div>

        <style>
          {`
            @keyframes audit-spin {
              to {
                transform: rotate(360deg);
              }
            }

            @keyframes audit-pulse {
              0%, 100% {
                opacity: 1;
              }
              50% {
                opacity: 0.45;
              }
            }
          `}
        </style>
      </Card>
    </div>
  );
}

function Skeleton({
  width,
  height,
  marginTop = 0,
}: {
  width: string;
  height: number;
  marginTop?: number;
}) {
  return (
    <div
      style={{
        width,
        height,
        marginTop,
        borderRadius: 999,
        background: '#e5e7eb',
        animation: 'audit-pulse 1.4s ease-in-out infinite',
      }}
    />
  );
}

function Alert({
  type,
  children,
}: {
  type: 'success' | 'error';
  children: React.ReactNode;
}) {
  const success = type === 'success';

  return (
    <div
      role="alert"
      style={{
        marginBottom: 16,
        padding: 12,
        borderRadius: 8,
        fontWeight: 600,
        background: success ? '#dcfce7' : '#fee2e2',
        color: success ? '#166534' : '#991b1b',
        border: success ? '1px solid #86efac' : '1px solid #fca5a5',
      }}
    >
      {children}
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  children,
  disabled = false,
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>
        {label}
      </label>

      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%',
          padding: '10px 12px',
          borderRadius: 8,
          border: '1px solid #d1d5db',
          background: disabled ? '#f3f4f6' : '#ffffff',
          cursor: disabled ? 'not-allowed' : 'pointer',
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

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '-';

  return date.toLocaleString();
}

function truncate(value?: string | null) {
  if (!value) return '-';

  return value.length > 70 ? `${value.slice(0, 70)}...` : value;
}

function getErrorMessage(error: any, fallback: string) {
  return error?.response?.data?.message || error?.message || fallback;
}

const preStyle: React.CSSProperties = {
  background: '#111827',
  color: '#e5e7eb',
  padding: 12,
  borderRadius: 8,
  overflowX: 'auto',
  fontSize: 12,
};