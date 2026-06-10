import { useEffect, useMemo, useState } from 'react';

import { projectsApi } from '../../api/projects.api';
import type { Project } from '../../api/projects.api';
import { schedulesApi } from '../../api/schedules.api';
import type {
  CreateBaselinePayload,
  ScheduleBaseline,
} from '../../api/schedules.api';

import PermissionGuard from '../../components/auth/PermissionGuard';
import { Button, Card, DataTable, Input, PageHeader } from '../../components/ui';
import { Eye } from 'lucide-react';
import { Pencil } from 'lucide-react';
import { Settings2 } from 'lucide-react';
import { Send } from 'lucide-react';
import { PowerOff } from 'lucide-react';
import { RotateCcw } from 'lucide-react';

type BaselineStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'SUPERSEDED'
  | string;

type BaselineForm = CreateBaselinePayload & {
  plannedStartDate?: string;
  plannedFinishDate?: string;
  revisionReason?: string;
};

type SortKey = 'version' | 'name' | 'status' | 'isActive' | 'createdAt' | 'approvedAt';
type SortDirection = 'asc' | 'desc';

const emptyForm: BaselineForm = {
  projectId: 0,
  name: '',
  description: '',
  plannedStartDate: '',
  plannedFinishDate: '',
  revisionReason: '',
};

const statusOptions = [
  { value: '', label: 'All statuses' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PENDING_APPROVAL', label: 'Pending Approval' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'SUPERSEDED', label: 'Superseded' },
];

const allowedStatuses = ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'SUPERSEDED'];

export default function SchedulesPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [baselines, setBaselines] = useState<ScheduleBaseline[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | ''>('');
  const [editingBaseline, setEditingBaseline] = useState<ScheduleBaseline | null>(null);
  const [viewingBaseline, setViewingBaseline] = useState<ScheduleBaseline | null>(null);

  const [form, setForm] = useState<BaselineForm>(emptyForm);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [sortKey, setSortKey] = useState<SortKey>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const isSuccess = message.toLowerCase().includes('successfully');

  useEffect(() => {
    loadProjects();
  }, []);

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === Number(selectedProjectId)),
    [projects, selectedProjectId],
  );

  const filteredBaselines = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return [...baselines]
      .filter((baseline) => {
        const matchesKeyword =
          !keyword ||
          baseline.version?.toLowerCase().includes(keyword) ||
          baseline.name?.toLowerCase().includes(keyword) ||
          baseline.status?.toLowerCase().includes(keyword) ||
          baseline.description?.toLowerCase().includes(keyword);

        const matchesStatus = !statusFilter || baseline.status === statusFilter;

        const matchesActive =
          activeFilter === 'all' ||
          (activeFilter === 'active' && baseline.isActive) ||
          (activeFilter === 'inactive' && !baseline.isActive);

        return matchesKeyword && matchesStatus && matchesActive;
      })
      .sort((a, b) => compareBaseline(a, b, sortKey, sortDirection));
  }, [baselines, search, statusFilter, activeFilter, sortKey, sortDirection]);
  const [statusModalBaseline, setStatusModalBaseline] =
    useState<ScheduleBaseline | null>(null);
  const [statusModalValue, setStatusModalValue] = useState('');
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
      setMessage(getErrorMessage(error, 'Failed to load projects'));
    } finally {
      setLoading(false);
    }
  }
  async function handleConfirmStatusChange() {
    if (!statusModalBaseline) return;

    const normalizedStatus = statusModalValue.trim().toUpperCase();

    if (normalizedStatus === statusModalBaseline.status) {
      setStatusModalBaseline(null);
      return;
    }

    setStatusModalBaseline(null);

    if (normalizedStatus === 'PENDING_APPROVAL') {
      return handleSubmitForApproval(statusModalBaseline.id);
    }

    if (normalizedStatus === 'APPROVED') {
      return handleApprove(statusModalBaseline.id);
    }

    if (normalizedStatus === 'REJECTED') {
      return handleReject(statusModalBaseline.id);
    }

    if (normalizedStatus === 'SUPERSEDED') {
      return handleDeactivate(statusModalBaseline.id);
    }

    if (normalizedStatus === 'DRAFT') {
      return handleActivate(statusModalBaseline.id);
    }
  }

  async function handleUnlock(id: number) {
    const confirmed = window.confirm(
      'Create revision from this approved baseline?',
    );

    if (!confirmed) return;

    await runBaselineAction(
      () => schedulesApi.unlockBaseline(id),
      'Revision baseline created successfully',
      'Failed to create revision baseline',
    );
  }
  async function loadBaselines(projectId: number) {
    try {
      setLoading(true);
      setMessage('');
      const data = await schedulesApi.findByProject(projectId);
      setBaselines(data);
    } catch (error: any) {
      setMessage(getErrorMessage(error, 'Failed to load baselines'));
    } finally {
      setLoading(false);
    }
  }

  function updateField(name: keyof BaselineForm, value: string | number) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleProjectChange(value: string) {
    const projectId = Number(value);

    setSelectedProjectId(projectId || '');
    setEditingBaseline(null);
    setViewingBaseline(null);
    setForm({ ...emptyForm, projectId });

    if (projectId) {
      await loadBaselines(projectId);
    } else {
      setBaselines([]);
    }
  }

  function handleView(baseline: ScheduleBaseline) {
    setViewingBaseline(baseline);
  }

  function handleLocked(baseline: ScheduleBaseline) {
    setViewingBaseline(baseline);
    setMessage('This baseline is approved and locked. Approved baselines are controlled records and cannot be edited.');
  }

  function handleEdit(baseline: ScheduleBaseline) {
    if (!baseline.isActive) {
      setMessage('Inactive baseline cannot be edited. Activate it first.');
      return;
    }

    if (baseline.status === 'APPROVED') {
      handleLocked(baseline);
      return;
    }

    setEditingBaseline(baseline);
    setViewingBaseline(null);

    setForm({
      projectId: baseline.projectId,
      name: baseline.name || '',
      version: baseline.version || '',
      description: baseline.description || '',
      plannedStartDate: toDateInputValue((baseline as any).plannedStartDate),
      plannedFinishDate: toDateInputValue((baseline as any).plannedFinishDate),
      revisionReason: (baseline as any).revisionReason || '',
    });

    setMessage('');
  }

  function cancelEdit() {
    setEditingBaseline(null);
    setForm({ ...emptyForm, projectId: selectedProjectId ? Number(selectedProjectId) : 0 });
  }

  function validateForm() {
    if (!form.projectId) return 'Select project first';
    if (!form.name.trim()) return 'Baseline name is required';



    if (form.plannedStartDate && form.plannedFinishDate) {
      if (new Date(form.plannedStartDate) > new Date(form.plannedFinishDate)) {
        return 'Planned start date cannot be later than planned finish date';
      }
    }

    return '';
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      setMessage(validationError);
      return;
    }

    try {
      setSubmitting(true);
      setMessage('');

      const payload: CreateBaselinePayload = {
        projectId: Number(form.projectId),
        name: form.name.trim(),
        description: form.description?.trim() || '',
      };

      if (editingBaseline) {
        await schedulesApi.updateBaseline(editingBaseline.id, payload);
        setMessage('Schedule baseline updated successfully');
      } else {
        await schedulesApi.createBaseline(payload);
        setMessage('Schedule baseline created successfully');
      }

      setEditingBaseline(null);
      setForm({ ...emptyForm, projectId: Number(form.projectId) });
      await loadBaselines(Number(form.projectId));
    } catch (error: any) {
      setMessage(
        getErrorMessage(
          error,
          editingBaseline ? 'Failed to update schedule baseline' : 'Failed to create schedule baseline',
        ),
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmitForApproval(id: number) {
    const confirmed = window.confirm('Submit this schedule baseline for approval?');
    if (!confirmed) return;

    await runBaselineAction(
      () => schedulesApi.submitBaselineForApproval(id),
      'Schedule baseline submitted for approval successfully',
      'Failed to submit schedule baseline for approval',
    );
  }

  async function handleApprove(id: number) {
    const confirmed = window.confirm('Approve this schedule baseline? Approved baselines become controlled records and cannot be edited.');
    if (!confirmed) return;

    await runBaselineAction(
      () => schedulesApi.approveBaseline(id),
      'Schedule baseline approved successfully',
      'Failed to approve schedule baseline',
    );
  }

  async function handleReject(id: number) {
    const reason = window.prompt('Enter rejection reason');
    if (!reason) return;

    await runBaselineAction(
      () => schedulesApi.rejectBaseline(id, { reason }),
      'Schedule baseline rejected successfully',
      'Failed to reject schedule baseline',
    );
  }

  async function handleDeactivate(id: number) {
    const confirmed = window.confirm('Deactivate this schedule baseline? It will remain in the audit history.');
    if (!confirmed) return;

    await runBaselineAction(
      () => schedulesApi.removeBaseline(id),
      'Schedule baseline deactivated successfully',
      'Failed to deactivate schedule baseline',
    );
  }

  async function handleActivate(id: number) {
    const confirmed = window.confirm('Activate this schedule baseline?');
    if (!confirmed) return;

    await runBaselineAction(
      () => schedulesApi.activateBaseline(id),
      'Schedule baseline activated successfully',
      'Failed to activate schedule baseline',
    );
  }

  async function handleDelete(id: number) {
    const confirmed = window.confirm('Permanently delete this draft baseline? Only draft or inactive records should be deleted.');
    if (!confirmed) return;

    await runBaselineAction(
      () => schedulesApi.deleteBaseline(id),
      'Schedule baseline deleted successfully',
      'Failed to delete schedule baseline',
    );
  }

  function handleEditStatus(baseline: ScheduleBaseline) {
    setStatusModalBaseline(baseline);
    setStatusModalValue(String(baseline.status || 'DRAFT'));
  }

  async function runBaselineAction(action: () => Promise<any>, successMessage: string, fallbackError: string) {
    try {
      setLoading(true);
      setMessage('');
      await action();
      setMessage(successMessage);

      if (selectedProjectId) {
        await loadBaselines(Number(selectedProjectId));
      }
    } catch (error: any) {
      setMessage(getErrorMessage(error, fallbackError));
    } finally {
      setLoading(false);
    }
  }

  function handleSort(nextSortKey: SortKey) {
    if (sortKey === nextSortKey) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortKey(nextSortKey);
    setSortDirection('asc');
  }

  return (
    <div>
      <PageHeader
        title="Schedule Baselines"
        description="Create, review, approve, control, and audit project schedule baseline snapshots."
      />

      {message && <Alert type={isSuccess ? 'success' : 'error'}>{message}</Alert>}

      <div style={summaryGridStyle}>
        <MetricCard label="Total Baselines" value={baselines.length} />
        <MetricCard label="Approved" value={baselines.filter((item) => item.status === 'APPROVED').length} />
        <MetricCard label="Active" value={baselines.filter((item) => item.isActive).length} />
        <MetricCard label="Controlled Project" value={selectedProject ? selectedProject.code : '-'} />
      </div>

      <div className="module-grid">
        <PermissionGuard permissions={editingBaseline ? ['schedules:update'] : ['schedules:create']}>
          <Card title={editingBaseline ? `Edit Baseline: ${editingBaseline.version}` : 'Create Baseline'}>
            <form onSubmit={handleSubmit} noValidate>
              <SelectField label="Project" value={form.projectId} onChange={handleProjectChange} required>
                <option value={0}>Select project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.code} - {project.name}
                  </option>
                ))}
              </SelectField>

              <Input
                label="Baseline Name"
                placeholder="Initial Approved Baseline"
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                required
              />

              {/* <Input
                label="Version"
                placeholder="BL-001"
                value={form.version}
                onChange={(e) => updateField('version', e.target.value)}
                required
              /> */}

              <Input
                label="Planned Start Date"
                type="date"
                value={form.plannedStartDate ?? ''}
                onChange={(e) => updateField('plannedStartDate', e.target.value)}
              />

              <Input
                label="Planned Finish Date"
                type="date"
                value={form.plannedFinishDate ?? ''}
                onChange={(e) => updateField('plannedFinishDate', e.target.value)}
              />

              <TextAreaField
                label="Description / Basis of Baseline"
                value={form.description ?? ''}
                onChange={(value) => updateField('description', value)}
                placeholder="Scope, assumptions, constraints, calendar, data date, and approval basis"
              />

              {editingBaseline && (
                <TextAreaField
                  label="Revision Reason"
                  value={form.revisionReason ?? ''}
                  onChange={(value) => updateField('revisionReason', value)}
                  placeholder="Explain why this baseline is being revised"
                />
              )}

              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <Button disabled={submitting} style={{ flex: 1 }}>
                  {submitting ? 'Saving...' : editingBaseline ? 'Save Changes' : 'Create Baseline'}
                </Button>

                {editingBaseline && (
                  <Button type="button" variant="secondary" onClick={cancelEdit}>
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          </Card>
        </PermissionGuard>

        <Card title="Baseline Register">
          <div style={toolbarStyle}>
            <Input
              label="Search"
              placeholder="Search version, name, status..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <SelectField label="Status" value={statusFilter} onChange={setStatusFilter}>
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </SelectField>

            <SelectField label="Record State" value={activeFilter} onChange={(value) => setActiveFilter(value as any)}>
              <option value="all">All records</option>
              <option value="active">Active only</option>
              <option value="inactive">Inactive only</option>
            </SelectField>
          </div>

          {loading && <p>Loading...</p>}

<DataTable<ScheduleBaseline>
  columns={[
    { header: 'Version', accessor: 'version' },
    { header: 'Name', accessor: 'name' },
    { header: 'Status', accessor: (row) => <StatusBadge status={row.status as BaselineStatus} /> },

    {
      header: 'Rejection Reason',
      accessor: (row) =>
        row.status === 'REJECTED'
          ? row.rejectionReason || '-'
          : '-',
    },

    { header: 'Active', accessor: (row) => (row.isActive ? 'Yes' : 'No') },
    { header: 'Tasks', accessor: (row) => row.items?.length ?? 0 },
    { header: 'Start', accessor: () => '-' },
    { header: 'Finish', accessor: () => '-' },
    { header: 'Approved At', accessor: (row) => formatDate(row.approvedAt) },
    { header: 'Created', accessor: (row) => formatDate(row.createdAt) },
    {
      header: 'Actions',
      accessor: (row) => (
        <BaselineActions
          baseline={row}
          onView={handleView}
          onEdit={handleEdit}
          onLocked={handleLocked}
          onUnlock={handleUnlock}
          onEditStatus={handleEditStatus}
          onSubmitForApproval={handleSubmitForApproval}
          onApprove={handleApprove}
          onReject={handleReject}
          onActivate={handleActivate}
          onDeactivate={handleDeactivate}
          onDelete={handleDelete}
        />
      ),
    },
  ]}
  data={filteredBaselines}
  emptyMessage="No schedule baselines found"
/>
        </Card>
      </div>

      {viewingBaseline && <BaselineDetailsModal baseline={viewingBaseline} onClose={() => setViewingBaseline(null)} />}
      {statusModalBaseline && (
        <div style={modalOverlayStyle} role="dialog" aria-modal="true">
          <div style={{ ...modalStyle, width: 'min(460px, 100%)' }}>
            <h2 style={{ marginTop: 0 }}>Change Baseline Status</h2>

            <p style={{ color: '#64748b' }}>
              Select the next workflow status for{' '}
              <strong>{statusModalBaseline.version}</strong>.
            </p>

            <SelectField
              label="Status"
              value={statusModalValue}
              onChange={setStatusModalValue}
              required
            >
              <option value="DRAFT">Draft</option>
              <option value="PENDING_APPROVAL">Pending Approval</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="SUPERSEDED">Superseded</option>
            </SelectField>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setStatusModalBaseline(null)}
              >
                Cancel
              </Button>

              <Button type="button" onClick={handleConfirmStatusChange}>
                Update Status
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BaselineActions({
  baseline,
  onView,
  onEdit,
  onLocked,
  onUnlock,
  onEditStatus,
  onSubmitForApproval,
  onApprove,
  onReject,
  onActivate,
  onDeactivate,
  onDelete,
}: {
  baseline: ScheduleBaseline;

  onView: (baseline: ScheduleBaseline) => void;
  onEdit: (baseline: ScheduleBaseline) => void;
  onLocked: (baseline: ScheduleBaseline) => void;

  onUnlock: (id: number) => void;

  onEditStatus: (baseline: ScheduleBaseline) => void;

  onSubmitForApproval: (id: number) => void;
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
  onActivate: (id: number) => void;
  onDeactivate: (id: number) => void;
  onDelete: (id: number) => void;
}) {
  const status = String(baseline.status || 'DRAFT');
  const isApproved = status === 'APPROVED';
  const isPending = status === 'PENDING_APPROVAL';
  const isDraft = status === 'DRAFT' || status === 'REJECTED';
  const iconButtonStyle: React.CSSProperties = {
    width: 34,
    height: 34,
    padding: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  };

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      <Button
        type="button"
        variant="secondary"
        onClick={() => onView(baseline)}
        style={iconButtonStyle}
        title="View Baseline"
      >
        <Eye size={16} />
      </Button>

      {isApproved ? (
        <Button
          type="button"
          onClick={() => onUnlock(baseline.id)}
          style={iconButtonStyle}
          title="Create Revision"
        >
          <RotateCcw size={16} />
        </Button>
      ) : (
        baseline.isActive && (
          <PermissionGuard permissions={['schedules:update']}>
            <Button
              type="button"
              variant="secondary"
              onClick={() => onEdit(baseline)}
              style={iconButtonStyle}
              title="Edit Baseline"
            >
              <Pencil size={16} />
            </Button>
          </PermissionGuard>
        )
      )}

      <PermissionGuard permissions={['schedules:update']}>
        <Button
          type="button"
          variant="secondary"
          onClick={() => onEditStatus(baseline)}
          style={iconButtonStyle}
          title="Change Status"
        >
          <Settings2 size={16} />
        </Button>
      </PermissionGuard>

      {isDraft && baseline.isActive && (
        <PermissionGuard permissions={['schedules:update']}>
          <Button
            type="button"
            onClick={() => onSubmitForApproval(baseline.id)}
            style={iconButtonStyle}
            title="Submit For Approval"
          >
            <Send size={16} />
          </Button>
        </PermissionGuard>
      )}

      {isPending && baseline.isActive && (
        <PermissionGuard permissions={['schedules:approve']}>
          <Button type="button" onClick={() => onApprove(baseline.id)} style={smallButtonStyle}>
            Approve
          </Button>
          <Button type="button" variant="danger" onClick={() => onReject(baseline.id)} style={smallButtonStyle}>
            Reject
          </Button>
        </PermissionGuard>
      )}

      {baseline.isActive ? (
        <PermissionGuard permissions={['schedules:delete']}>
          <Button
            type="button"
            variant="danger"
            onClick={() => onDeactivate(baseline.id)}
            style={iconButtonStyle}
            title="Deactivate Baseline"
          >
            <PowerOff size={16} />
          </Button>
        </PermissionGuard>
      ) : (
        <PermissionGuard permissions={['schedules:update']}>
          <Button type="button" onClick={() => onActivate(baseline.id)} style={smallButtonStyle}>
            Activate
          </Button>
        </PermissionGuard>
      )}

      {!isApproved && !baseline.isActive && (
        <PermissionGuard permissions={['schedules:delete']}>
          <Button type="button" variant="danger" onClick={() => onDelete(baseline.id)} style={smallButtonStyle}>
            Delete
          </Button>
        </PermissionGuard>
      )}
    </div>
  );
}

function BaselineDetailsModal({
  baseline,
  onClose,
}: {
  baseline: ScheduleBaseline;
  onClose: () => void;
}) {
  return (
    <div
      style={modalOverlayStyle}
      role="dialog"
      aria-modal="true"
      aria-labelledby="baseline-details-title"
    >
      <div style={modalStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
          <h2 id="baseline-details-title" style={{ margin: 0 }}>
            {baseline.version} - {baseline.name}
          </h2>

          <Button type="button" variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>

        <div style={detailsGridStyle}>
          <Detail label="Status" value={baseline.status || '-'} />

          <Detail
            label="Rejection Reason"
            value={baseline.rejectionReason || '-'}
            wide
          />

          <Detail label="Active" value={baseline.isActive ? 'Yes' : 'No'} />
          <Detail label="Tasks" value={String(baseline.items?.length ?? 0)} />
          <Detail label="Created" value={formatDate(baseline.createdAt)} />
          <Detail label="Approved At" value={formatDate(baseline.approvedAt)} />
          <Detail label="Rejected At" value={formatDate(baseline.rejectedAt)} />
          <Detail label="Submitted At" value={formatDate(baseline.submittedAt)} />

          <Detail
            label="Planned Start"
            value={formatDate((baseline as any).plannedStartDate)}
          />

          <Detail
            label="Planned Finish"
            value={formatDate((baseline as any).plannedFinishDate)}
          />

          <Detail
            label="Description"
            value={baseline.description || '-'}
            wide
          />
        </div>
      </div>
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  children,
  required,
}: {
  label: string;
  value?: string | number | null;
  onChange: (value: string) => void;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>
        {label} {required && <span aria-label="required">*</span>}
      </label>
      <select value={value ?? ''} onChange={(e) => onChange(e.target.value)} required={required} style={fieldStyle}>
        {children}
      </select>
    </div>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>{label}</label>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={4}
        style={{ ...fieldStyle, resize: 'vertical' }}
      />
    </div>
  );
}

function Alert({ type, children }: { type: 'success' | 'error'; children: React.ReactNode }) {
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

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={metricCardStyle}>
      <div style={{ color: '#64748b', fontSize: 13 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 800 }}>{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status?: BaselineStatus }) {
  const normalizedStatus = status || 'DRAFT';
  const label = normalizedStatus.replace(/_/g, ' ');
  return <span style={badgeStyle(normalizedStatus)}>{label}</span>;
}

function Detail({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <div style={{ gridColumn: wide ? '1 / -1' : undefined }}>
      <div style={{ color: '#64748b', fontSize: 13, marginBottom: 4 }}>{label}</div>
      <div style={{ fontWeight: 600, whiteSpace: 'pre-wrap' }}>{value}</div>
    </div>
  );
}

function compareBaseline(a: ScheduleBaseline, b: ScheduleBaseline, sortKey: SortKey, direction: SortDirection) {
  const aValue = getSortableValue(a, sortKey);
  const bValue = getSortableValue(b, sortKey);

  if (aValue < bValue) return direction === 'asc' ? -1 : 1;
  if (aValue > bValue) return direction === 'asc' ? 1 : -1;
  return 0;
}

function getSortableValue(row: ScheduleBaseline, key: SortKey) {
  const value = row[key as keyof ScheduleBaseline];

  if (key === 'createdAt' || key === 'approvedAt') {
    return value ? new Date(String(value)).getTime() : 0;
  }

  if (key === 'isActive') return row.isActive ? 1 : 0;

  return String(value ?? '').toLowerCase();
}

function formatDate(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  }).format(date);
}

function toDateInputValue(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

function getErrorMessage(error: any, fallback: string) {
  return error?.response?.data?.message || error?.message || fallback;
}

const fieldStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 8,
  border: '1px solid #d1d5db',
  background: '#fff',
};

const summaryGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: 12,
  marginBottom: 16,
};

const metricCardStyle: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #e5e7eb',
  borderRadius: 12,
  padding: 16,
  boxShadow: '0 1px 2px rgba(15, 23, 42, 0.06)',
};

const toolbarStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(220px, 1fr) 180px 180px',
  gap: 12,
  alignItems: 'end',
  marginBottom: 16,
};

const smallButtonStyle: React.CSSProperties = { padding: '6px 10px' };

const modalOverlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(15, 23, 42, 0.45)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  padding: 24,
};

const modalStyle: React.CSSProperties = {
  width: 'min(760px, 100%)',
  background: '#fff',
  borderRadius: 14,
  padding: 24,
  boxShadow: '0 20px 40px rgba(15, 23, 42, 0.25)',
};

const detailsGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: 16,
  marginTop: 20,
};

function badgeStyle(status: string): React.CSSProperties {
  const base: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    borderRadius: 999,
    padding: '4px 10px',
    fontSize: 12,
    fontWeight: 700,
    textTransform: 'capitalize',
  };

  switch (status) {
    case 'APPROVED':
      return { ...base, background: '#dcfce7', color: '#166534' };
    case 'PENDING_APPROVAL':
      return { ...base, background: '#fef9c3', color: '#854d0e' };
    case 'REJECTED':
      return { ...base, background: '#fee2e2', color: '#991b1b' };
    case 'SUPERSEDED':
      return { ...base, background: '#e5e7eb', color: '#374151' };
    default:
      return { ...base, background: '#e0f2fe', color: '#075985' };
  }
}
