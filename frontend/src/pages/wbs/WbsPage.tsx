import { useEffect, useState } from 'react';
import { projectsApi } from '../../api/projects.api';
import type { Project } from '../../api/projects.api';
import { wbsApi } from '../../api/wbs.api';
import type { CreateWbsPayload, WbsItem } from '../../api/wbs.api';
import PermissionGuard from '../../components/auth/PermissionGuard';
import { Button, Card, DataTable, Input, PageHeader } from '../../components/ui';

const emptyForm: CreateWbsPayload = {
  projectId: 0,
  parentId: null,
  name: '',
  description: '',
  sortOrder: 0,
};

export default function WbsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [wbsItems, setWbsItems] = useState<WbsItem[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | ''>('');
  const [editingWbs, setEditingWbs] = useState<WbsItem | null>(null);
  const [form, setForm] = useState<CreateWbsPayload>(emptyForm);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const isSuccess = message.toLowerCase().includes('successfully');

  useEffect(() => {
    loadInitialData();
  }, []); 

  async function loadInitialData() {
    try {
      setLoading(true);
      setMessage('');

      const projectData = await projectsApi.findAll();
      setProjects(projectData);

      if (projectData.length > 0) {
        const firstProjectId = projectData[0].id;

        setSelectedProjectId(firstProjectId);
        setForm((prev) => ({
          ...prev,
          projectId: firstProjectId,
        }));

        await loadWbs(firstProjectId);
      }
    } catch (error: any) {
      setMessage(error.response?.data?.message || 'Failed to load WBS data');
    } finally {
      setLoading(false);
    }
  }

  async function loadWbs(projectId: number) {
    try {
      const data = await wbsApi.findByProject(projectId);
      setWbsItems(data);
    } catch (error: any) {
      setMessage(error.response?.data?.message || 'Failed to load WBS items');
    }
  }

  function updateField(
    name: keyof CreateWbsPayload,
    value: string | number | null,
  ) {
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleProjectChange(value: string) {
    const projectId = Number(value);

    setSelectedProjectId(projectId || '');
    setEditingWbs(null);

    setForm({
      ...emptyForm,
      projectId,
    });

    if (projectId) {
      await loadWbs(projectId);
    } else {
      setWbsItems([]);
    }
  }

  function handleEdit(item: WbsItem) {
    setEditingWbs(item);

    setForm({
      projectId: item.projectId,
      parentId: item.parentId ?? null,
      name: item.name,
      description: item.description || '',
      sortOrder: item.sortOrder ?? 0,
    });

    setMessage('');
  }

  function cancelEdit() {
    setEditingWbs(null);

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
const payload: CreateWbsPayload = {
  projectId: Number(form.projectId),
  parentId: form.parentId ? Number(form.parentId) : null,
  name: form.name,
  description: form.description || '',
  sortOrder: Number(form.sortOrder ?? 0),
};

      if (editingWbs) {
        await wbsApi.update(editingWbs.id, payload);
        setMessage('WBS item updated successfully');
      } else {
        await wbsApi.create(payload);
        setMessage('WBS item created successfully');
      }

      setEditingWbs(null);

      setForm({
        ...emptyForm,
        projectId: Number(form.projectId),
      });

      await loadWbs(Number(form.projectId));
    } catch (error: any) {
      setMessage(
        error.response?.data?.message ||
          (editingWbs
            ? 'Failed to update WBS item'
            : 'Failed to create WBS item'),
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: number) {
    const confirmed = window.confirm('Delete this WBS item?');

    if (!confirmed) return;

    try {
      setLoading(true);
      setMessage('');

      await wbsApi.remove(id);

      setMessage('WBS item deleted successfully');

      if (selectedProjectId) {
        await loadWbs(Number(selectedProjectId));
      }
    } catch (error: any) {
      setMessage(error.response?.data?.message || 'Failed to delete WBS item');
    } finally {
      setLoading(false);
    }
  }

  const parentOptions = wbsItems.filter((item) => item.id !== editingWbs?.id);

  return (
    <div>
      <PageHeader
        title="WBS"
        description="Manage Work Breakdown Structure hierarchy and project scope."
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
        <PermissionGuard permissions={editingWbs ? ['wbs:update'] : ['wbs:create']}>
          <Card title={editingWbs ? `Edit WBS: ${editingWbs.code}` : 'Create WBS Item'}>
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

              <SelectField
                label="Parent WBS"
                value={form.parentId ?? ''}
                onChange={(value) =>
                  updateField('parentId', value ? Number(value) : null)
                }
              >
                <option value="">No parent</option>

                {parentOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.code} - {item.name}
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
  WBS code will be generated automatically by the system.
  {editingWbs && (
    <strong style={{ display: 'block', marginTop: 4, color: '#111827' }}>
      Current Code: {editingWbs.code}
    </strong>
  )}
</div>

              <Input
                label="WBS Name"
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
                label="Sort Order"
                type="number"
                value={form.sortOrder ?? 0}
                onChange={(e) => updateField('sortOrder', Number(e.target.value))}
              />

              <div style={{ display: 'flex', gap: 10 }}>
                <Button disabled={loading} style={{ flex: 1 }}>
                  {loading
                    ? 'Saving...'
                    : editingWbs
                      ? 'Save Changes'
                      : 'Create WBS Item'}
                </Button>

                {editingWbs && (
                  <Button type="button" variant="secondary" onClick={cancelEdit}>
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          </Card>
        </PermissionGuard>

        <Card title="WBS List">
          {loading && <p>Loading...</p>}

          <DataTable<WbsItem>
            columns={[
              {
                header: 'Code',
                accessor: 'code',
              },
              {
                header: 'Name',
                accessor: 'name',
              },
              {
                header: 'Parent',
                accessor: (row) => row.parent?.code || '-',
              },
              {
                header: 'Sort',
                accessor: 'sortOrder',
              },
              {
                header: 'Description',
                accessor: (row) => row.description || '-',
              },
              {
                header: 'Actions',
                accessor: (row) => (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <PermissionGuard permissions={['wbs:update']}>
                      <Button
                        variant="secondary"
                        onClick={() => handleEdit(row)}
                        style={{ padding: '6px 10px' }}
                      >
                        Edit
                      </Button>
                    </PermissionGuard>

                    <PermissionGuard permissions={['wbs:delete']}>
                      <Button
                        variant="danger"
                        onClick={() => handleDelete(row.id)}
                        style={{ padding: '6px 10px' }}
                      >
                        Delete
                      </Button>
                    </PermissionGuard>
                  </div>
                ),
              },
            ]}
            data={wbsItems}
            emptyMessage={
              selectedProjectId
                ? 'No WBS items found'
                : 'Select a project to view WBS items'
            }
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