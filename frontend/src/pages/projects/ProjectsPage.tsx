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
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const isSuccess = message.toLowerCase().includes('successfully');

  useEffect(() => {
    loadInitialData();
  }, []);

  async function loadInitialData() {
    await Promise.all([loadCompanies(), loadProjects()]);
  }

  async function loadCompanies() {
    const data = await companiesApi.findAll();
    setCompanies(data);

    if (data.length > 0) {
      setForm((prev) => ({
        ...prev,
        companyId: prev.companyId || data[0].id,
      }));
    }
  }

  async function loadProjects(companyId?: number) {
    try {
      setLoading(true);

      const data = await projectsApi.findAll(companyId);
      setProjects(data);
    } catch (error: any) {
      setMessage(error.response?.data?.message || 'Failed to load projects');
    } finally {
      setLoading(false);
    }
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
    if (!companyIdValue) {
      setSelectedCompanyId('');
      await loadProjects();
      return;
    }

    const companyId = Number(companyIdValue);
    setSelectedCompanyId(companyId);
    await loadProjects(companyId);
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
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      setLoading(true);
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

      await loadProjects(selectedCompanyId ? Number(selectedCompanyId) : undefined);
    } catch (error: any) {
      setMessage(
        error.response?.data?.message ||
          (editingProject ? 'Failed to update project' : 'Failed to create project'),
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleDeactivate(id: number) {
    const confirmed = window.confirm('Cancel/deactivate this project?');
    if (!confirmed) return;

    try {
      setLoading(true);
      await projectsApi.remove(id);
      setMessage('Project deactivated successfully');
      await loadProjects(selectedCompanyId ? Number(selectedCompanyId) : undefined);
    } catch (error: any) {
      setMessage(error.response?.data?.message || 'Failed to deactivate project');
    } finally {
      setLoading(false);
    }
  }

  async function handleActivate(project: Project) {
    try {
      setLoading(true);
      await projectsApi.update(project.id, { status: 'ACTIVE' } as any);
      setMessage('Project activated successfully');
      await loadProjects(selectedCompanyId ? Number(selectedCompanyId) : undefined);
    } catch (error: any) {
      setMessage(error.response?.data?.message || 'Failed to activate project');
    } finally {
      setLoading(false);
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

      <div className="module-grid">
        <PermissionGuard permissions={editingProject ? ['projects:update'] : ['projects:create']}>
          <Card title={editingProject ? `Edit Project: ${editingProject.name}` : 'Create Project'}>
            <form onSubmit={handleSubmit}>
              <SelectField
                label="Company"
                value={form.companyId}
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
                onChange={(value) => updateField('status', value)}
              >
                <option value="PLANNING">Planning</option>
                <option value="ACTIVE">Active</option>
                <option value="ON_HOLD">On Hold</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </SelectField>

              <div style={{ display: 'flex', gap: 10 }}>
                <Button disabled={loading} style={{ flex: 1 }}>
                  {loading
                    ? 'Saving...'
                    : editingProject
                      ? 'Save Changes'
                      : 'Create Project'}
                </Button>

                {editingProject && (
                  <Button type="button" variant="secondary" onClick={cancelEdit}>
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

          {loading && <p>Loading...</p>}

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
                    ? `${row.currency} ${Number(row.budget).toLocaleString()}`
                    : '-',
              },
              { header: 'Status', accessor: 'status' },
              {
                header: 'Actions',
                accessor: (row) => (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <PermissionGuard permissions={['projects:update']}>
                      <Button
                        variant="secondary"
                        onClick={() => handleEdit(row)}
                        style={{ padding: '6px 10px' }}
                      >
                        Edit
                      </Button>
                    </PermissionGuard>

                    {row.status === 'CANCELLED' ? (
                      <PermissionGuard permissions={['projects:update']}>
                        <Button
                          onClick={() => handleActivate(row)}
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
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value?: string | number;
  onChange: (value: string) => void;
  children: React.ReactNode;
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