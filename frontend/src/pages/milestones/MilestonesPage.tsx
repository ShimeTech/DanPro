import { useEffect, useState } from 'react';

import { milestonesApi } from '../../api/milestones.api';
import type {
  CreateMilestonePayload,
  Milestone,
} from '../../api/milestones.api';
import { projectsApi } from '../../api/projects.api';
import type { Project } from '../../api/projects.api';

import PermissionGuard from '../../components/auth/PermissionGuard';
import { Button, Card, DataTable, Input, PageHeader } from '../../components/ui';

const emptyForm: CreateMilestonePayload = {
  projectId: 0,
  name: '',
  description: '',
  plannedDate: '',
  actualDate: '',
  status: 'PLANNED',
};

export default function MilestonesPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | ''>('');
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);

  const [form, setForm] = useState<CreateMilestonePayload>(emptyForm);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const isSuccess = message.toLowerCase().includes('successfully');

  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
    try {
      setLoading(true);
      setMessage('');

      const data = await projectsApi.findAll();
      setProjects(data);

      if (data.length > 0) {
        await handleProjectChange(String(data[0].id));
      }
    } catch (error: any) {
      setMessage(error.response?.data?.message || 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  }

  async function loadMilestones(projectId: number) {
    try {
      const data = await milestonesApi.findByProject(projectId);
      setMilestones(data);
    } catch (error: any) {
      setMessage(error.response?.data?.message || 'Failed to load milestones');
    }
  }

  function updateField(
    name: keyof CreateMilestonePayload,
    value: string | number,
  ) {
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleProjectChange(value: string) {
    const projectId = Number(value);

    setSelectedProjectId(projectId || '');
    setEditingMilestone(null);

    setForm({
      ...emptyForm,
      projectId,
    });

    if (projectId) {
      await loadMilestones(projectId);
    } else {
      setMilestones([]);
    }
  }

function handleEdit(milestone: Milestone) {
  setEditingMilestone(milestone);

  setForm({
    projectId: milestone.projectId,
    name: milestone.name,
    description: milestone.description || '',
    plannedDate: milestone.plannedDate?.slice(0, 10) || '',
    actualDate: milestone.actualDate?.slice(0, 10) || '',
    status: milestone.status || 'PLANNED',
  });

  setMessage('');
}

  function cancelEdit() {
    setEditingMilestone(null);

    setForm({
      ...emptyForm,
      projectId: selectedProjectId ? Number(selectedProjectId) : 0,
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.projectId) {
      setMessage('Select project first');
      return;
    }

    try {
      setLoading(true);
      setMessage('');

      const payload: CreateMilestonePayload = {
        ...form,
        projectId: Number(form.projectId),
        actualDate: form.actualDate || undefined,
      };

      if (editingMilestone) {
        await milestonesApi.update(editingMilestone.id, payload);
        setMessage('Milestone updated successfully');
      } else {
        await milestonesApi.create(payload);
        setMessage('Milestone created successfully');
      }

      setEditingMilestone(null);

      setForm({
        ...emptyForm,
        projectId: Number(form.projectId),
      });

      await loadMilestones(Number(form.projectId));
    } catch (error: any) {
      setMessage(
        error.response?.data?.message ||
          (editingMilestone
            ? 'Failed to update milestone'
            : 'Failed to create milestone'),
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleDeactivate(id: number) {
    const confirmed = window.confirm('Deactivate this milestone?');

    if (!confirmed) return;

    try {
      setLoading(true);
      setMessage('');

      await milestonesApi.remove(id);

      setMessage('Milestone deactivated successfully');

      if (selectedProjectId) {
        await loadMilestones(Number(selectedProjectId));
      }
    } catch (error: any) {
      setMessage(error.response?.data?.message || 'Failed to deactivate milestone');
    } finally {
      setLoading(false);
    }
  }

  async function handleActivate(id: number) {
    try {
      setLoading(true);
      setMessage('');

      await milestonesApi.activate(id);

      setMessage('Milestone activated successfully');

      if (selectedProjectId) {
        await loadMilestones(Number(selectedProjectId));
      }
    } catch (error: any) {
      setMessage(error.response?.data?.message || 'Failed to activate milestone');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Milestones"
        description="Track critical project milestones, planned dates, actual dates, and status."
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
        <PermissionGuard
          permissions={editingMilestone ? ['milestones:update'] : ['milestones:create']}
        >
          <Card
            title={
              editingMilestone
                ? `Edit Milestone: ${editingMilestone.code}`
                : 'Create Milestone'
            }
          >
            <form onSubmit={handleSubmit}>
              <SelectField
                label="Project"
                value={form.projectId}
                onChange={handleProjectChange}
              >
                <option value={0}>Select project</option>

                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.code} - {project.name}
                  </option>
                ))}
              </SelectField>

<div
  style={{
    marginBottom: 12,
    padding: 12,
    borderRadius: 8,
    background: '#f8fafc',
    border: '1px solid #e5e7eb',
    color: '#475569',
    fontSize: 14,
  }}
>
  Milestone code will be generated automatically by the system.
  {editingMilestone && (
    <strong style={{ display: 'block', marginTop: 4, color: '#111827' }}>
      Current Code: {editingMilestone.code}
    </strong>
  )}
</div>

              <Input
                label="Milestone Name"
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                required
              />

              <Input
                label="Description"
                value={form.description ?? ''}
                onChange={(e) => updateField('description', e.target.value)}
              />

              <Input
                label="Planned Date"
                type="date"
                value={form.plannedDate}
                onChange={(e) => updateField('plannedDate', e.target.value)}
                required
              />

              <Input
                label="Actual Date"
                type="date"
                value={form.actualDate ?? ''}
                onChange={(e) => updateField('actualDate', e.target.value)}
              />

              <SelectField
                label="Status"
                value={form.status ?? 'PLANNED'}
                onChange={(value) => updateField('status', value)}
              >
                <option value="PLANNED">Planned</option>
                <option value="ACHIEVED">Achieved</option>
                <option value="DELAYED">Delayed</option>
                <option value="CANCELLED">Cancelled</option>
              </SelectField>

              <div style={{ display: 'flex', gap: 10 }}>
                <Button disabled={loading} style={{ flex: 1 }}>
                  {loading
                    ? 'Saving...'
                    : editingMilestone
                      ? 'Save Changes'
                      : 'Create Milestone'}
                </Button>

                {editingMilestone && (
                  <Button type="button" variant="secondary" onClick={cancelEdit}>
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          </Card>
        </PermissionGuard>

        <Card title="Milestone List">
          {loading && <p>Loading...</p>}

          <DataTable<Milestone>
            columns={[
              { header: 'Code', accessor: 'code' },
              { header: 'Name', accessor: 'name' },
              {
                header: 'Planned',
                accessor: (row) => formatDate(row.plannedDate),
              },
              {
                header: 'Actual',
                accessor: (row) => formatDate(row.actualDate),
              },
              { header: 'Status', accessor: 'status' },
              {
                header: 'Active',
                accessor: (row) => (row.isActive ? 'Yes' : 'No'),
              },
              {
                header: 'Description',
                accessor: (row) => row.description || '-',
              },
              {
                header: 'Actions',
                accessor: (row) => (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <PermissionGuard permissions={['milestones:update']}>
                      <Button
                        variant="secondary"
                        onClick={() => handleEdit(row)}
                        style={{ padding: '6px 10px' }}
                      >
                        Edit
                      </Button>
                    </PermissionGuard>

                    {row.isActive ? (
                      <PermissionGuard permissions={['milestones:delete']}>
                        <Button
                          variant="danger"
                          onClick={() => handleDeactivate(row.id)}
                          style={{ padding: '6px 10px' }}
                        >
                          Deactivate
                        </Button>
                      </PermissionGuard>
                    ) : (
                      <PermissionGuard permissions={['milestones:update']}>
                        <Button
                          onClick={() => handleActivate(row.id)}
                          style={{ padding: '6px 10px' }}
                        >
                          Activate
                        </Button>
                      </PermissionGuard>
                    )}
                  </div>
                ),
              },
            ]}
            data={milestones}
            emptyMessage="No milestones found"
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
  value?: string | number | null;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>
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

function formatDate(value?: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString();
}