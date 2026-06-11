import { useEffect, useState } from 'react';

import { projectsApi } from '../../api/projects.api';
import type { Project } from '../../api/projects.api';
import { tasksApi } from '../../api/tasks.api';
import type { CreateTaskPayload, Task } from '../../api/tasks.api';
import { wbsApi } from '../../api/wbs.api';
import type { WbsItem } from '../../api/wbs.api';

import PermissionGuard from '../../components/auth/PermissionGuard';
import { Button, Card, DataTable, Input, PageHeader } from '../../components/ui';

const emptyForm: CreateTaskPayload = {
  projectId: 0,
  wbsItemId: null,
  parentTaskId: null,
  name: '',
  description: '',
  status: 'NOT_STARTED',
  priority: 'MEDIUM',
  plannedStart: '',
  plannedEnd: '',
  durationDays: undefined,
  progress: 0,
};

export default function TasksPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [wbsItems, setWbsItems] = useState<WbsItem[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | ''>('');
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const [form, setForm] = useState<CreateTaskPayload>(emptyForm);
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
        setForm({
          ...emptyForm,
          projectId: firstProjectId,
        });

        const [wbsData, taskData] = await Promise.all([
          wbsApi.findByProject(firstProjectId),
          tasksApi.findByProject(firstProjectId),
        ]);

        setWbsItems(wbsData);
        setTasks(taskData);
      } else {
        setSelectedProjectId('');
        setWbsItems([]);
        setTasks([]);
      }
    } catch (error: any) {
      setMessage(error.response?.data?.message || 'Failed to load tasks data');
    } finally {
      setPageLoading(false);
    }
  }

  async function loadProjectData(projectId: number) {
    const [wbsData, taskData] = await Promise.all([
      wbsApi.findByProject(projectId),
      tasksApi.findByProject(projectId),
    ]);

    setWbsItems(wbsData);
    setTasks(taskData);
  }

  function updateField(
    name: keyof CreateTaskPayload,
    value: string | number | null | undefined,
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
      setEditingTask(null);

      setForm({
        ...emptyForm,
        projectId,
      });

      if (projectId) {
        await loadProjectData(projectId);
      } else {
        setWbsItems([]);
        setTasks([]);
      }
    } catch (error: any) {
      setMessage(error.response?.data?.message || 'Failed to load project tasks');
    } finally {
      setActionLoading(false);
    }
  }

  function handleEdit(task: Task) {
    setEditingTask(task);

    setForm({
      projectId: task.projectId,
      wbsItemId: task.wbsItemId ?? null,
      parentTaskId: task.parentTaskId ?? null,
      name: task.name,
      description: task.description || '',
      status: task.status,
      priority: task.priority,
      plannedStart: task.plannedStart?.slice(0, 10) || '',
      plannedEnd: task.plannedEnd?.slice(0, 10) || '',
      durationDays: task.durationDays ?? undefined,
      progress: Number(task.progress ?? 0),
      assignedToId: task.assignedToId ?? undefined,
    });

    setMessage('');
  }

  function cancelEdit() {
    setEditingTask(null);

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

      const payload: CreateTaskPayload = {
        ...form,
        projectId: Number(form.projectId),
        wbsItemId: form.wbsItemId ? Number(form.wbsItemId) : null,
        parentTaskId: form.parentTaskId ? Number(form.parentTaskId) : null,
        durationDays: form.durationDays ? Number(form.durationDays) : undefined,
        progress: form.progress ? Number(form.progress) : 0,
        assignedToId: form.assignedToId ? Number(form.assignedToId) : undefined,
      };

      if (editingTask) {
        await tasksApi.update(editingTask.id, payload);
        setMessage('Task updated successfully');
      } else {
        await tasksApi.create(payload);
        setMessage('Task created successfully');
      }

      setEditingTask(null);

      setForm({
        ...emptyForm,
        projectId: Number(form.projectId),
      });

      await loadProjectData(Number(form.projectId));
    } catch (error: any) {
      setMessage(
        error.response?.data?.message ||
          (editingTask ? 'Failed to update task' : 'Failed to create task'),
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDeactivate(id: number) {
    const confirmed = window.confirm('Deactivate this task?');

    if (!confirmed) return;

    try {
      setActionLoading(true);
      setMessage('');

      await tasksApi.remove(id);
      setMessage('Task deactivated successfully');

      if (selectedProjectId) {
        await loadProjectData(Number(selectedProjectId));
      }
    } catch (error: any) {
      setMessage(error.response?.data?.message || 'Failed to deactivate task');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleActivate(id: number) {
    try {
      setActionLoading(true);
      setMessage('');

      await tasksApi.activate(id);
      setMessage('Task activated successfully');

      if (selectedProjectId) {
        await loadProjectData(Number(selectedProjectId));
      }
    } catch (error: any) {
      setMessage(error.response?.data?.message || 'Failed to activate task');
    } finally {
      setActionLoading(false);
    }
  }

  const parentTaskOptions = tasks.filter((task) => task.id !== editingTask?.id);

  return (
    <div>
      <PageHeader
        title="Tasks"
        description="Create and manage project tasks, WBS links, dates, progress, and priorities."
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
        <TasksLoading />
      ) : (
        <div className="module-grid">
          <PermissionGuard permissions={editingTask ? ['tasks:update'] : ['tasks:create']}>
            <Card title={editingTask ? `Edit Task: ${editingTask.code}` : 'Create Task'}>
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
                  label="WBS Item"
                  value={form.wbsItemId ?? ''}
                  disabled={actionLoading}
                  onChange={(value) =>
                    updateField('wbsItemId', value ? Number(value) : null)
                  }
                >
                  <option value="">No WBS item</option>

                  {wbsItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.code} - {item.name}
                    </option>
                  ))}
                </SelectField>

                <SelectField
                  label="Parent Task"
                  value={form.parentTaskId ?? ''}
                  disabled={actionLoading}
                  onChange={(value) =>
                    updateField('parentTaskId', value ? Number(value) : null)
                  }
                >
                  <option value="">No parent task</option>

                  {parentTaskOptions.map((task) => (
                    <option key={task.id} value={task.id}>
                      {task.code} - {task.name}
                    </option>
                  ))}
                </SelectField>

                <Input
                  label="Task Name"
                  value={form.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  required
                />

                <Input
                  label="Description"
                  value={form.description ?? ''}
                  onChange={(e) => updateField('description', e.target.value)}
                />

                <SelectField
                  label="Status"
                  value={form.status ?? 'NOT_STARTED'}
                  disabled={actionLoading}
                  onChange={(value) => updateField('status', value)}
                >
                  <option value="NOT_STARTED">Not Started</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="ON_HOLD">On Hold</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </SelectField>

                <SelectField
                  label="Priority"
                  value={form.priority ?? 'MEDIUM'}
                  disabled={actionLoading}
                  onChange={(value) => updateField('priority', value)}
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </SelectField>

                <Input
                  label="Planned Start"
                  type="date"
                  value={form.plannedStart ?? ''}
                  onChange={(e) => updateField('plannedStart', e.target.value)}
                />

                <Input
                  label="Planned End"
                  type="date"
                  value={form.plannedEnd ?? ''}
                  onChange={(e) => updateField('plannedEnd', e.target.value)}
                />

                <Input
                  label="Duration Days"
                  type="number"
                  value={form.durationDays ?? ''}
                  onChange={(e) =>
                    updateField(
                      'durationDays',
                      e.target.value ? Number(e.target.value) : undefined,
                    )
                  }
                />

                {!editingTask?.subtasks?.length && (
                  <Input
                    label="Progress %"
                    type="number"
                    min={0}
                    max={100}
                    value={form.progress ?? 0}
                    onChange={(e) => updateField('progress', Number(e.target.value))}
                  />
                )}

                {editingTask?.subtasks?.length ? (
                  <p style={{ marginBottom: 12, color: '#64748b', fontSize: 14 }}>
                    Progress is automatically calculated from subtasks.
                  </p>
                ) : null}

                <div style={{ display: 'flex', gap: 10 }}>
                  <Button disabled={actionLoading} style={{ flex: 1 }}>
                    {actionLoading
                      ? 'Saving...'
                      : editingTask
                        ? 'Save Changes'
                        : 'Create Task'}
                  </Button>

                  {editingTask && (
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

          <Card title="Task List">
            <DataTable<Task>
              columns={[
                { header: 'Code', accessor: 'code' },
                { header: 'Name', accessor: 'name' },
                {
                  header: 'WBS',
                  accessor: (row) =>
                    row.wbsItem ? `${row.wbsItem.code} - ${row.wbsItem.name}` : '-',
                },
                {
                  header: 'Status',
                  accessor: (row) => (
                    <span
                      style={{
                        color:
                          row.status === 'COMPLETED'
                            ? '#15803d'
                            : row.status === 'CANCELLED'
                              ? '#991b1b'
                              : row.status === 'IN_PROGRESS'
                                ? '#1d4ed8'
                                : '#92400e',
                        fontWeight: 700,
                      }}
                    >
                      {row.status}
                    </span>
                  ),
                },
                {
                  header: 'Active',
                  accessor: (row) => (row.isActive ? 'Yes' : 'No'),
                },
                { header: 'Priority', accessor: 'priority' },
                {
                  header: 'Progress',
                  accessor: (row) => `${Number(row.progress)}%`,
                },
                {
                  header: 'Planned Dates',
                  accessor: (row) =>
                    `${formatDate(row.plannedStart)} → ${formatDate(row.plannedEnd)}`,
                },
                {
                  header: 'Actions',
                  accessor: (row) => (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <PermissionGuard permissions={['tasks:update']}>
                        <Button
                          variant="secondary"
                          onClick={() => handleEdit(row)}
                          disabled={actionLoading}
                          style={{ padding: '6px 10px' }}
                        >
                          Edit
                        </Button>
                      </PermissionGuard>

                      {row.isActive ? (
                        <PermissionGuard permissions={['tasks:delete']}>
                          <Button
                            variant="danger"
                            onClick={() => handleDeactivate(row.id)}
                            disabled={actionLoading}
                            style={{ padding: '6px 10px' }}
                          >
                            Deactivate
                          </Button>
                        </PermissionGuard>
                      ) : (
                        <PermissionGuard permissions={['tasks:update']}>
                          <Button
                            onClick={() => handleActivate(row.id)}
                            disabled={actionLoading}
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
              data={tasks}
              emptyMessage={
                selectedProjectId
                  ? 'No tasks found'
                  : 'Select a project to view tasks'
              }
            />
          </Card>
        </div>
      )}
    </div>
  );
}

function TasksLoading() {
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
              animation: 'tasks-spin 0.8s linear infinite',
            }}
          />

          <div>
            <strong style={{ color: '#111827' }}>Loading tasks</strong>

            <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: 14 }}>
              Retrieving project tasks, WBS links, dates, and priorities from
              the server. Please wait.
            </p>
          </div>
        </div>

        <div className="module-grid">
          <div
            style={{
              minHeight: 620,
              padding: 18,
              borderRadius: 14,
              background: '#ffffff',
              border: '1px solid #e5e7eb',
            }}
          >
            <Skeleton width="150px" height={18} />

            {Array.from({ length: 12 }).map((_, index) => (
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
              minHeight: 620,
              padding: 18,
              borderRadius: 14,
              background: '#ffffff',
              border: '1px solid #e5e7eb',
            }}
          >
            <Skeleton width="130px" height={18} />

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
            @keyframes tasks-spin {
              to {
                transform: rotate(360deg);
              }
            }

            @keyframes tasks-pulse {
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
        animation: 'tasks-pulse 1.4s ease-in-out infinite',
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

function formatDate(value?: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString();
}