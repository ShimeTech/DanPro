import { useEffect, useState } from 'react';

import { companiesApi } from '../../api/companies.api';
import type { Company } from '../../api/companies.api';
import { projectsApi } from '../../api/projects.api';
import type { CreateProjectPayload, Project } from '../../api/projects.api';

import PermissionGuard from '../../components/auth/PermissionGuard';
import { Button, Card, DataTable, Input, PageHeader } from '../../components/ui';

const emptyForm: CreateProjectPayload = {
  companyId: 0,
  code: '',
  name: '',
  description: '',
  clientName: '',
  location: '',
  startDate: '',
  endDate: '',
  budget: undefined,
  currency: 'USD',
  status: 'PLANNING',
};

export default function ProjectsPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | ''>('');
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [form, setForm] = useState<CreateProjectPayload>(emptyForm);

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

      const [companyData, projectData] = await Promise.all([
        companiesApi.findAll(),
        projectsApi.findAll(),
      ]);

      setCompanies(companyData);
      setProjects(projectData);

      if (companyData.length > 0) {
        setForm((prev) => ({
          ...prev,
          companyId: prev.companyId || companyData[0].id,
        }));
      }
    } catch (error: any) {
      setMessage(error.response?.data?.message || 'Failed to load projects');
    } finally {
      setPageLoading(false);
    }
  }

  async function loadProjects(companyId?: number) {
    const data = await projectsApi.findAll(companyId);
    setProjects(data);
  }

  function updateField(
    name: keyof CreateProjectPayload,
    value: string | number | undefined,
  ) {
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleFilter(companyIdValue: string) {
    try {
      setActionLoading(true);
      setMessage('');

      if (!companyIdValue) {
        setSelectedCompanyId('');
        await loadProjects();
        return;
      }

      const companyId = Number(companyIdValue);
      setSelectedCompanyId(companyId);
      await loadProjects(companyId);
    } catch (error: any) {
      setMessage(error.response?.data?.message || 'Failed to filter projects');
    } finally {
      setActionLoading(false);
    }
  }

  function handleEdit(project: Project) {
    setEditingProject(project);

    setForm({
      companyId: project.companyId,
      code: project.code || '',
      name: project.name || '',
      description: project.description || '',
      clientName: project.clientName || '',
      location: project.location || '',
      startDate: project.startDate?.slice(0, 10) || '',
      endDate: project.endDate?.slice(0, 10) || '',
      budget: project.budget ? Number(project.budget) : undefined,
      currency: project.currency || 'USD',
      status: project.status || 'PLANNING',
    });

    setMessage('');
  }

  function cancelEdit() {
    setEditingProject(null);
    setForm({
      ...emptyForm,
      companyId: companies[0]?.id || 0,
    });
    setMessage('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      setActionLoading(true);
      setMessage('');

      const payload = {
        ...form,
        companyId: Number(form.companyId),
        budget: form.budget ? Number(form.budget) : undefined,
      };

      if (editingProject) {
        await projectsApi.update(editingProject.id, payload);
        setMessage('Project updated successfully');
      } else {
        await projectsApi.create(payload);
        setMessage('Project created successfully');
      }

      setEditingProject(null);
      setForm({
        ...emptyForm,
        companyId: companies[0]?.id || 0,
      });

      await loadProjects(
        selectedCompanyId ? Number(selectedCompanyId) : undefined,
      );
    } catch (error: any) {
      setMessage(
        error.response?.data?.message ||
          (editingProject
            ? 'Failed to update project'
            : 'Failed to create project'),
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDeactivate(id: number) {
    const confirmed = window.confirm('Cancel/deactivate this project?');
    if (!confirmed) return;

    try {
      setActionLoading(true);
      setMessage('');

      await projectsApi.remove(id);
      setMessage('Project deactivated successfully');

      await loadProjects(
        selectedCompanyId ? Number(selectedCompanyId) : undefined,
      );
    } catch (error: any) {
      setMessage(
        error.response?.data?.message || 'Failed to deactivate project',
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function handleActivate(project: Project) {
    try {
      setActionLoading(true);
      setMessage('');

      await projectsApi.update(project.id, { status: 'ACTIVE' } as any);
      setMessage('Project activated successfully');

      await loadProjects(
        selectedCompanyId ? Number(selectedCompanyId) : undefined,
      );
    } catch (error: any) {
      setMessage(error.response?.data?.message || 'Failed to activate project');
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Projects"
        description="Manage construction projects and link them to companies."
      />

      {message && (
        <div
          role="alert"
          style={{
            marginBottom: 16,
            padding: 12,
            borderRadius: 8,
            fontWeight: 600,
            background: isSuccess ? '#dcfce7' : '#fee2e2',
            color: isSuccess ? '#166534' : '#991b1b',
            border: isSuccess ? '1px solid #86efac' : '1px solid #fca5a5',
          }}
        >
          {message}
        </div>
      )}

      {pageLoading ? (
        <ProjectsLoading />
      ) : (
        <div className="module-grid">
          <PermissionGuard
            permissions={
              editingProject ? ['projects:update'] : ['projects:create']
            }
          >
            <Card
              title={
                editingProject
                  ? `Edit Project: ${editingProject.name}`
                  : 'Create Project'
              }
            >
              <form onSubmit={handleSubmit} aria-busy={actionLoading}>
                <SelectField
                  label="Company"
                  value={form.companyId}
                  disabled={actionLoading}
                  onChange={(value) => updateField('companyId', Number(value))}
                >
                  <option value={0}>Select company</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </SelectField>

                <Input
                  label="Project Code"
                  value={form.code}
                  onChange={(e) => updateField('code', e.target.value)}
                  required
                />

                <Input
                  label="Project Name"
                  value={form.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  required
                />

                <Input
                  label="Client Name"
                  value={form.clientName}
                  onChange={(e) => updateField('clientName', e.target.value)}
                />

                <Input
                  label="Location"
                  value={form.location}
                  onChange={(e) => updateField('location', e.target.value)}
                />

                <Input
                  label="Start Date"
                  type="date"
                  value={form.startDate}
                  onChange={(e) => updateField('startDate', e.target.value)}
                />

                <Input
                  label="End Date"
                  type="date"
                  value={form.endDate}
                  onChange={(e) => updateField('endDate', e.target.value)}
                />

                <Input
                  label="Budget"
                  type="number"
                  value={form.budget ?? ''}
                  onChange={(e) =>
                    updateField(
                      'budget',
                      e.target.value ? Number(e.target.value) : undefined,
                    )
                  }
                />

                <Input
                  label="Currency"
                  value={form.currency}
                  onChange={(e) => updateField('currency', e.target.value)}
                />

                <SelectField
                  label="Status"
                  value={form.status}
                  disabled={actionLoading}
                  onChange={(value) => updateField('status', value)}
                >
                  <option value="PLANNING">Planning</option>
                  <option value="ACTIVE">Active</option>
                  <option value="ON_HOLD">On Hold</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </SelectField>

                <div style={{ display: 'flex', gap: 10 }}>
                  <Button disabled={actionLoading} style={{ flex: 1 }}>
                    {actionLoading
                      ? 'Saving...'
                      : editingProject
                        ? 'Save Changes'
                        : 'Create Project'}
                  </Button>

                  {editingProject && (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={cancelEdit}
                      disabled={actionLoading}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </form>
            </Card>
          </PermissionGuard>

          <Card title="Project List">
            <div style={{ marginBottom: 16 }}>
              <SelectField
                label="Filter by Company"
                value={selectedCompanyId}
                disabled={actionLoading}
                onChange={handleFilter}
              >
                <option value="">All companies</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </SelectField>
            </div>

            <DataTable<Project>
              columns={[
                { header: 'Code', accessor: 'code' },
                { header: 'Name', accessor: 'name' },
                {
                  header: 'Company',
                  accessor: (row) => row.company?.name || row.companyId,
                },
                {
                  header: 'Client',
                  accessor: (row) => row.clientName || '-',
                },
                {
                  header: 'Location',
                  accessor: (row) => row.location || '-',
                },
                {
                  header: 'Budget',
                  accessor: (row) =>
                    row.budget
                      ? `${row.currency} ${Number(
                          row.budget,
                        ).toLocaleString()}`
                      : '-',
                },
                {
                  header: 'Status',
                  accessor: (row) => (
                    <span
                      style={{
                        color:
                          row.status === 'ACTIVE'
                            ? '#15803d'
                            : row.status === 'CANCELLED'
                              ? '#991b1b'
                              : '#92400e',
                        fontWeight: 700,
                      }}
                    >
                      {row.status}
                    </span>
                  ),
                },
                {
                  header: 'Actions',
                  accessor: (row) => (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <PermissionGuard permissions={['projects:update']}>
                        <Button
                          variant="secondary"
                          onClick={() => handleEdit(row)}
                          disabled={actionLoading}
                          style={{ padding: '6px 10px' }}
                        >
                          Edit
                        </Button>
                      </PermissionGuard>

                      {row.status === 'CANCELLED' ? (
                        <PermissionGuard permissions={['projects:update']}>
                          <Button
                            onClick={() => handleActivate(row)}
                            disabled={actionLoading}
                            style={{ padding: '6px 10px' }}
                          >
                            Activate
                          </Button>
                        </PermissionGuard>
                      ) : (
                        <PermissionGuard permissions={['projects:delete']}>
                          <Button
                            variant="danger"
                            onClick={() => handleDeactivate(row.id)}
                            disabled={actionLoading}
                            style={{ padding: '6px 10px' }}
                          >
                            Cancel
                          </Button>
                        </PermissionGuard>
                      )}
                    </div>
                  ),
                },
              ]}
              data={projects}
              emptyMessage="No projects found"
            />
          </Card>
        </div>
      )}
    </div>
  );
}

function ProjectsLoading() {
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
              animation: 'projects-spin 0.8s linear infinite',
            }}
          />

          <div>
            <strong style={{ color: '#111827' }}>Loading projects</strong>

            <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: 14 }}>
              Retrieving project and company records from the server. Please
              wait.
            </p>
          </div>
        </div>

        <div className="module-grid">
          <div
            style={{
              minHeight: 560,
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
                height={36}
                marginTop={18}
              />
            ))}
          </div>

          <div
            style={{
              minHeight: 560,
              padding: 18,
              borderRadius: 14,
              background: '#ffffff',
              border: '1px solid #e5e7eb',
            }}
          >
            <Skeleton width="150px" height={18} />

            <Skeleton width="100%" height={38} marginTop={20} />

            {Array.from({ length: 8 }).map((_, index) => (
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
            @keyframes projects-spin {
              to {
                transform: rotate(360deg);
              }
            }

            @keyframes projects-pulse {
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
        animation: 'projects-pulse 1.4s ease-in-out infinite',
      }}
    />
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
  value?: string | number;
  onChange: (value: string) => void;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label
        style={{
          display: 'block',
          marginBottom: 6,
          fontWeight: 600,
        }}
      >
        {label}
      </label>

      <select
        value={value ?? ''}
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