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

      const projectData = await projectsApi.findAll();
      setProjects(projectData);

      if (projectData.length > 0) {
        const firstProjectId = projectData[0].id;

        setSelectedProjectId(firstProjectId);
        setForm((prev) => ({
          ...prev,
          projectId: firstProjectId,
        }));

        const wbsData = await wbsApi.findByProject(firstProjectId);
        setWbsItems(wbsData);
      } else {
        setSelectedProjectId('');
        setWbsItems([]);
      }
    } catch (error: any) {
      setMessage(error.response?.data?.message || 'Failed to load WBS data');
    } finally {
      setPageLoading(false);
    }
  }

  async function loadWbs(projectId: number) {
    const data = await wbsApi.findByProject(projectId);
    setWbsItems(data);
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
    try {
      setActionLoading(true);
      setMessage('');

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
    } catch (error: any) {
      setMessage(error.response?.data?.message || 'Failed to load WBS items');
    } finally {
      setActionLoading(false);
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

    setMessage('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.projectId) {
      setMessage('Select project first');
      return;
    }

    try {
      setActionLoading(true);
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
      setActionLoading(false);
    }
  }

  async function handleDelete(id: number) {
    const confirmed = window.confirm('Delete this WBS item?');

    if (!confirmed) return;

    try {
      setActionLoading(true);
      setMessage('');

      await wbsApi.remove(id);
      setMessage('WBS item deleted successfully');

      if (selectedProjectId) {
        await loadWbs(Number(selectedProjectId));
      }
    } catch (error: any) {
      setMessage(error.response?.data?.message || 'Failed to delete WBS item');
    } finally {
      setActionLoading(false);
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
        <WbsLoading />
      ) : (
        <div className="module-grid">
          <PermissionGuard
            permissions={editingWbs ? ['wbs:update'] : ['wbs:create']}
          >
            <Card
              title={
                editingWbs ? `Edit WBS: ${editingWbs.code}` : 'Create WBS Item'
              }
            >
              <form onSubmit={handleSubmit} aria-busy={actionLoading}>
                <SelectField
                  label="Project"
                  value={form.projectId}
                  disabled={actionLoading}
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
                  disabled={actionLoading}
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
                    <strong
                      style={{
                        display: 'block',
                        marginTop: 4,
                        color: '#111827',
                      }}
                    >
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
                  onChange={(e) =>
                    updateField('sortOrder', Number(e.target.value))
                  }
                />

                <div style={{ display: 'flex', gap: 10 }}>
                  <Button disabled={actionLoading} style={{ flex: 1 }}>
                    {actionLoading
                      ? 'Saving...'
                      : editingWbs
                        ? 'Save Changes'
                        : 'Create WBS Item'}
                  </Button>

                  {editingWbs && (
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

          <Card title="WBS List">
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
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <PermissionGuard permissions={['wbs:update']}>
                        <Button
                          variant="secondary"
                          onClick={() => handleEdit(row)}
                          disabled={actionLoading}
                          style={{ padding: '6px 10px' }}
                        >
                          Edit
                        </Button>
                      </PermissionGuard>

                      <PermissionGuard permissions={['wbs:delete']}>
                        <Button
                          variant="danger"
                          onClick={() => handleDelete(row.id)}
                          disabled={actionLoading}
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
      )}
    </div>
  );
}

function WbsLoading() {
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
              animation: 'wbs-spin 0.8s linear infinite',
            }}
          />

          <div>
            <strong style={{ color: '#111827' }}>Loading WBS</strong>

            <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: 14 }}>
              Retrieving project scope hierarchy from the server. Please wait.
            </p>
          </div>
        </div>

        <div className="module-grid">
          <div
            style={{
              minHeight: 430,
              padding: 18,
              borderRadius: 14,
              background: '#ffffff',
              border: '1px solid #e5e7eb',
            }}
          >
            <Skeleton width="170px" height={18} />

            {Array.from({ length: 7 }).map((_, index) => (
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
              minHeight: 430,
              padding: 18,
              borderRadius: 14,
              background: '#ffffff',
              border: '1px solid #e5e7eb',
            }}
          >
            <Skeleton width="140px" height={18} />

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
            @keyframes wbs-spin {
              to {
                transform: rotate(360deg);
              }
            }

            @keyframes wbs-pulse {
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
        animation: 'wbs-pulse 1.4s ease-in-out infinite',
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
  value?: string | number | null;
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