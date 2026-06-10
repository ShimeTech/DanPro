import { useEffect, useMemo, useState } from 'react';

import {
  CheckCircle2,
  Edit,
  Eye,
  RefreshCcw,
  RotateCcw,
  Save,
  Trash2,
  X,
  XCircle,
} from 'lucide-react';

import { approvalsApi } from '../../api/approvals.api';
import { rfisApi } from '../../api/rfis.api';
import type { Rfi } from '../../api/rfis.api';
import { submittalsApi } from '../../api/submittals.api';
import type { Submittal } from '../../api/submittals.api';
import type {
  Approval,
  ApprovalStatus, 
  CreateApprovalPayload,
} from '../../api/approvals.api';
import { projectsApi } from '../../api/projects.api';
import type { Project } from '../../api/projects.api';
import { Button, Card, DataTable, Input, PageHeader } from '../../components/ui';

const approvalStatuses: ApprovalStatus[] = ['PENDING', 'APPROVED', 'REJECTED', 'RETURNED'];
const reviewStatuses: ApprovalStatus[] = ['APPROVED', 'REJECTED', 'RETURNED'];

const emptyForm: CreateApprovalPayload = {
  projectId: 0,
  status: 'PENDING',
  module: '',
  entityName: '',
  entityId: 0,
  comments: '',
};

export default function ApprovalsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | ''>('');
  const [selectedApprovalId, setSelectedApprovalId] = useState<number | ''>('');
  const [selectedApproval, setSelectedApproval] = useState<Approval | null>(null);
  const [editingApproval, setEditingApproval] = useState<Approval | null>(null);
  const [reviewStatus, setReviewStatus] = useState<ApprovalStatus>('APPROVED');
  const [reviewComments, setReviewComments] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [rfis, setRfis] = useState<Rfi[]>([]);
const [submittals, setSubmittals] = useState<Submittal[]>([]);
const [approvalTarget, setApprovalTarget] = useState('');

  const [form, setForm] = useState<CreateApprovalPayload>(emptyForm);

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === Number(selectedProjectId)),
    [projects, selectedProjectId],
  );

  const filteredApprovals = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return approvals.filter((approval) => {
      const matchesKeyword =
        !keyword ||
        [approval.module, approval.entityName, approval.entityId, approval.status, approval.comments, approval.user?.name]
          .some((value) => String(value || '').toLowerCase().includes(keyword));

      const matchesStatus = !statusFilter || approval.status === statusFilter;
      return matchesKeyword && matchesStatus;
    });
  }, [approvals, search, statusFilter]);

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
      if (data.length > 0) await handleProjectChange(String(data[0].id));
    } catch (error: any) {
      setMessage(getErrorMessage(error, 'Failed to load projects'));
    } finally {
      setLoading(false);
    }
  }

async function loadApprovals(projectId: number) {
  if (!projectId) {
    setApprovals([]);
    setRfis([]);
    setSubmittals([]);
    return;
  }

  try {
    setLoading(true);
    setMessage('');

    const [approvalData, rfiData, submittalData] = await Promise.all([
      approvalsApi.findByProject(projectId),
      rfisApi.findByProject(projectId),
      submittalsApi.findByProject(projectId),
    ]);

    setApprovals(approvalData);
    setRfis(rfiData);
    setSubmittals(submittalData);
  } catch (error: any) {
    setMessage(getErrorMessage(error, 'Failed to load approvals'));
  } finally {
    setLoading(false);
  }
}

  async function handleProjectChange(value: string) {
    const projectId = Number(value);
    setSelectedProjectId(projectId || '');
    setSelectedApprovalId('');
    setSelectedApproval(null);
    setEditingApproval(null);
    setForm({ ...emptyForm, projectId });

    if (projectId) await loadApprovals(projectId);
  }

  function updateField(name: keyof CreateApprovalPayload, value: string | number | null) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }
function handleApprovalTargetChange(value: string) {
  setApprovalTarget(value);

  if (!value) {
    setForm((prev) => ({
      ...prev,
      module: '',
      entityName: '',
      entityId: 0,
      rfiId: null,
      submittalId: null,
    }));
    return;
  }

  const [module, idText] = value.split(':');
  const entityId = Number(idText);

  if (module === 'rfis') {
    setForm((prev) => ({
      ...prev,
      module: 'rfis',
      entityName: 'Rfi',
      entityId,
      rfiId: entityId,
      submittalId: null,
    }));
  }

  if (module === 'submittals') {
    setForm((prev) => ({
      ...prev,
      module: 'submittals',
      entityName: 'Submittal',
      entityId,
      rfiId: null,
      submittalId: entityId,
    }));
  }
}
  function validateForm() {
    if (!form.projectId) return 'Project is required';
    if (!form.module.trim()) return 'Module is required';
    if (!form.entityName.trim()) return 'Entity name is required';
    if (!Number(form.entityId)) return 'Entity ID is required';
    return '';
  }

  async function handleSubmitForm(e: React.FormEvent) {
    e.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      setMessage(validationError);
      return;
    }

    try {
      setLoading(true);
      setMessage('');
      const payload: CreateApprovalPayload = {
        ...form,
        projectId: Number(form.projectId),
        module: form.module.trim().toLowerCase(),
        entityName: form.entityName.trim(),
        entityId: Number(form.entityId),
        status: String(form.status || 'PENDING').toUpperCase(),
        comments: form.comments?.trim() || '',
      };

      if (editingApproval) {
        await approvalsApi.update(editingApproval.id, payload);
        setMessage('Approval updated successfully');
      } else {
        await approvalsApi.create(payload);
        setMessage('Approval created successfully');
      }

      resetForm(Number(form.projectId));
      await loadApprovals(Number(form.projectId));
    } catch (error: any) {
      setMessage(getErrorMessage(error, editingApproval ? 'Failed to update approval' : 'Failed to create approval'));
    } finally {
      setLoading(false);
    }
  }

 function resetForm(projectId = Number(selectedProjectId || 0)) {
  setEditingApproval(null);
  setApprovalTarget('');
  setForm({ ...emptyForm, projectId });
}

function handleEdit(approval: Approval) {
  if (approval.status !== 'PENDING') {
    setMessage('Only pending approvals can be edited');
    return;
  }

  setEditingApproval(approval);
  setSelectedApproval(null);

  const targetValue = approval.rfi?.id
    ? `rfis:${approval.rfi.id}`
    : approval.submittal?.id
      ? `submittals:${approval.submittal.id}`
      : '';

  setApprovalTarget(targetValue);

  setForm({
    projectId: approval.projectId,
    userId: approval.userId ?? undefined,
    status: approval.status,
    module: approval.module || '',
    entityName: approval.entityName || '',
    entityId: approval.entityId,
    rfiId: approval.rfi?.id ?? null,
    submittalId: approval.submittal?.id ?? null,
    comments: approval.comments || '',
  });
}

  async function handleReview(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedApprovalId) {
      setMessage('Select approval first');
      return;
    }

    try {
      setLoading(true);
      setMessage('');
      await approvalsApi.review(Number(selectedApprovalId), {
        status: reviewStatus,
        comments: reviewComments.trim(),
      });
      setSelectedApprovalId('');
      setReviewStatus('APPROVED');
      setReviewComments('');
      setMessage('Approval reviewed successfully');
      if (selectedProjectId) await loadApprovals(Number(selectedProjectId));
    } catch (error: any) {
      setMessage(getErrorMessage(error, 'Failed to review approval'));
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel(id: number) {
    const confirmed = window.confirm('Cancel/return this approval?');
    if (!confirmed) return;
    await runAction(() => approvalsApi.cancel(id), 'Approval cancelled successfully', 'Failed to cancel approval');
  }

  async function handleReopen(id: number) {
    const confirmed = window.confirm('Reopen this approval?');
    if (!confirmed) return;
    await runAction(() => approvalsApi.reopen(id), 'Approval reopened successfully', 'Failed to reopen approval');
  }

  async function handleDelete(id: number) {
    const confirmed = window.confirm('Delete this approval? This cannot be undone.');
    if (!confirmed) return;
    await runAction(() => approvalsApi.remove(id), 'Approval deleted successfully', 'Failed to delete approval');
  }

  async function runAction(action: () => Promise<any>, successMessage: string, fallbackError: string) {
    try {
      setLoading(true);
      setMessage('');
      await action();
      setMessage(successMessage);
      if (selectedProjectId) await loadApprovals(Number(selectedProjectId));
    } catch (error: any) {
      setMessage(getErrorMessage(error, fallbackError));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <PageHeader title="Approvals" description="Create, edit, review, approve, reject, return, reopen, and audit workflow approvals." />

      {message && <Alert type={isSuccess ? 'success' : 'error'}>{message}</Alert>}

      <div style={summaryGridStyle}>
        <MetricCard label="Total Approvals" value={approvals.length} />
        <MetricCard label="Pending" value={approvals.filter((item) => item.status === 'PENDING').length} />
        <MetricCard label="Approved" value={approvals.filter((item) => item.status === 'APPROVED').length} />
        <MetricCard label="Project" value={selectedProject?.code || '-'} />
      </div>

      <div style={actionBarStyle}>
        <IconActionButton title="Refresh" onClick={() => selectedProjectId && loadApprovals(Number(selectedProjectId))}>
          <RefreshCcw size={16} /> Refresh
        </IconActionButton>
      </div>

      <div className="module-grid">
        <div className="module-sidebar">
          <Card title={editingApproval ? `Edit Approval #${editingApproval.id}` : 'Create Approval'}>
            <form onSubmit={handleSubmitForm}>
              <SelectField label="Project" value={form.projectId} onChange={handleProjectChange}>
                <option value={0}>Select project</option>
                {projects.map((project) => <option key={project.id} value={project.id}>{project.code} - {project.name}</option>)}
              </SelectField>

              <SelectField
  label="Approval Target"
  value={approvalTarget}
  onChange={handleApprovalTargetChange}
>
  <option value="">Select approval target</option>

  <optgroup label="RFIs">
    {rfis.map((rfi) => (
      <option key={`rfi-${rfi.id}`} value={`rfis:${rfi.id}`}>
        {rfi.code} - {rfi.title}
      </option>
    ))}
  </optgroup>

  <optgroup label="Submittals">
    {submittals.map((submittal) => (
      <option key={`submittal-${submittal.id}`} value={`submittals:${submittal.id}`}>
        {submittal.code} - {submittal.title}
      </option>
    ))}
  </optgroup>
</SelectField>

              <SelectField label="Status" value={form.status ?? 'PENDING'} onChange={(value) => updateField('status', value)}>
                {approvalStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
              </SelectField>

              <TextareaField label="Comments" value={form.comments ?? ''} onChange={(value) => updateField('comments', value)} />

              <div style={{ display: 'flex', gap: 8 }}>
                <Button disabled={loading} style={{ flex: 1 }}>
                  {loading ? 'Saving...' : editingApproval ? <><Save size={15} /> Save Changes</> : 'Create Approval'}
                </Button>
                {editingApproval && <Button type="button" variant="secondary" onClick={() => resetForm()}><X size={15} /> Cancel</Button>}
              </div>
            </form>
          </Card>

          <Card title="Review Approval">
            <form onSubmit={handleReview}>
              <SelectField label="Approval" value={selectedApprovalId} onChange={(value) => setSelectedApprovalId(value ? Number(value) : '')}>
                <option value="">Select approval</option>
                {approvals.filter((approval) => approval.status === 'PENDING').map((approval) => (
                  <option key={approval.id} value={approval.id}>#{approval.id} - {approval.module}:{approval.entityName}:{approval.entityId}</option>
                ))}
              </SelectField>

              <SelectField label="Review Status" value={reviewStatus} onChange={(value) => setReviewStatus(value as ApprovalStatus)}>
                {reviewStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
              </SelectField>

              <TextareaField label="Review Comments" value={reviewComments} onChange={setReviewComments} />

              <Button disabled={loading} style={{ width: '100%' }}>
                {loading ? 'Saving...' : <><CheckCircle2 size={15} /> Save Review</>}
              </Button>
            </form>
          </Card>
        </div>

        <Card title="Approval Register">
          <div style={toolbarStyle}>
            <Input label="Search" placeholder="Search module, entity, reviewer, comments..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <SelectField label="Status" value={statusFilter} onChange={setStatusFilter}>
              <option value="">All statuses</option>
              {approvalStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
            </SelectField>
          </div>

          {loading && <p>Loading...</p>}

          <DataTable<Approval>
            columns={[
              { header: 'ID', accessor: (row) => `#${row.id}` },
              { header: 'Module', accessor: 'module' },
              { header: 'Entity', accessor: (row) => `${row.entityName} #${row.entityId}` },
              { header: 'Status', accessor: (row) => <StatusBadge status={row.status} /> },
              { header: 'Reviewer', accessor: (row) => row.user?.name || '-' },
              { header: 'Approved At', accessor: (row) => formatDate(row.approvedAt) },
              { header: 'Comments', accessor: (row) => truncate(row.comments) },
              {
                header: 'Actions',
                accessor: (row) => (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <IconOnlyButton title="View" onClick={() => setSelectedApproval(row)}><Eye size={15} /></IconOnlyButton>
                    {row.status === 'PENDING' && <IconOnlyButton title="Edit" onClick={() => handleEdit(row)}><Edit size={15} /></IconOnlyButton>}
                    {row.status === 'PENDING' && <IconOnlyButton title="Approve" onClick={() => runAction(() => approvalsApi.review(row.id, { status: 'APPROVED', comments: row.comments || '' }), 'Approval approved successfully', 'Failed to approve')} color="#16a34a"><CheckCircle2 size={15} /></IconOnlyButton>}
                    {row.status === 'PENDING' && <IconOnlyButton title="Reject" onClick={() => runAction(() => approvalsApi.review(row.id, { status: 'REJECTED', comments: row.comments || '' }), 'Approval rejected successfully', 'Failed to reject')} color="#dc2626"><XCircle size={15} /></IconOnlyButton>}
                    {row.status === 'PENDING' && <IconOnlyButton title="Return/Cancel" onClick={() => handleCancel(row.id)}><X size={15} /></IconOnlyButton>}
                    {row.status !== 'PENDING' && <IconOnlyButton title="Reopen" onClick={() => handleReopen(row.id)} color="#2563eb"><RotateCcw size={15} /></IconOnlyButton>}
                    {row.status !== 'APPROVED' && <IconOnlyButton title="Delete" onClick={() => handleDelete(row.id)} color="#dc2626"><Trash2 size={15} /></IconOnlyButton>}
                  </div>
                ),
              },
            ]}
            data={filteredApprovals}
            emptyMessage="No approvals found"
          />
        </Card>
      </div>

      {selectedApproval && <ApprovalDetailsModal approval={selectedApproval} onClose={() => setSelectedApproval(null)} />}
    </div>
  );
}

function ApprovalDetailsModal({ approval, onClose }: { approval: Approval; onClose: () => void }) {
  return (
    <div style={modalOverlayStyle} role="dialog" aria-modal="true">
      <div style={modalStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
          <h2 style={{ margin: 0 }}>Approval #{approval.id}</h2>
          <Button type="button" variant="secondary" onClick={onClose}><X size={15} /> Close</Button>
        </div>
        <div style={detailsGridStyle}>
          <Detail label="Project" value={approval.project ? `${approval.project.code} - ${approval.project.name}` : '-'} />
          <Detail label="Status" value={approval.status} />
          <Detail label="Module" value={approval.module} />
          <Detail label="Entity" value={`${approval.entityName} #${approval.entityId}`} />
          <Detail label="Reviewer" value={approval.user?.name || '-'} />
          <Detail label="Approved At" value={formatDate(approval.approvedAt)} />
          <Detail label="Comments" value={approval.comments || '-'} wide />
        </div>
      </div>
    </div>
  );
}

function Alert({ type, children }: { type: 'success' | 'error'; children: React.ReactNode }) {
  const success = type === 'success';
  return <div role="alert" style={{ marginBottom: 16, padding: 12, borderRadius: 8, fontWeight: 600, background: success ? '#dcfce7' : '#fee2e2', color: success ? '#166534' : '#991b1b', border: success ? '1px solid #86efac' : '1px solid #fca5a5' }}>{children}</div>;
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return <div style={metricCardStyle}><div style={{ color: '#64748b', fontSize: 13 }}>{label}</div><div style={{ fontSize: 24, fontWeight: 800 }}>{value}</div></div>;
}

function StatusBadge({ status }: { status?: string }) {
  return <span style={badgeStyle(status || 'PENDING')}>{status || 'PENDING'}</span>;
}

function IconActionButton({ children, title, onClick }: { children: React.ReactNode; title: string; onClick: () => void }) {
  return <button type="button" title={title} onClick={onClick} style={iconActionButtonStyle}>{children}</button>;
}

function IconOnlyButton({ children, title, onClick, color }: { children: React.ReactNode; title: string; onClick: () => void; color?: string }) {
  return <button type="button" title={title} onClick={onClick} style={{ ...iconOnlyButtonStyle, color: color || '#334155' }}>{children}</button>;
}

function SelectField({ label, value, onChange, children }: { label: string; value: string | number; onChange: (value: string) => void; children: React.ReactNode }) {
  return <div style={{ marginBottom: 12 }}><label style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>{label}</label><select value={value} onChange={(e) => onChange(e.target.value)} style={fieldStyle}>{children}</select></div>;
}

function TextareaField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <div style={{ marginBottom: 12 }}><label style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>{label}</label><textarea value={value} onChange={(e) => onChange(e.target.value)} rows={4} style={{ ...fieldStyle, resize: 'vertical' }} /></div>;
}

function Detail({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return <div style={{ gridColumn: wide ? '1 / -1' : undefined }}><div style={{ color: '#64748b', fontSize: 13, marginBottom: 4 }}>{label}</div><div style={{ fontWeight: 600, whiteSpace: 'pre-wrap' }}>{value}</div></div>;
}

function formatDate(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: '2-digit' }).format(date);
}

function truncate(value?: string | null) {
  if (!value) return '-';
  return value.length > 50 ? `${value.slice(0, 50)}...` : value;
}

function getErrorMessage(error: any, fallback: string) {
  return error?.response?.data?.message || error?.message || fallback;
}

const summaryGridStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 16 };
const metricCardStyle: React.CSSProperties = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, boxShadow: '0 1px 2px rgba(15, 23, 42, 0.06)' };
const actionBarStyle: React.CSSProperties = { display: 'flex', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 8, marginBottom: 16 };
const toolbarStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'minmax(220px, 1fr) 180px', gap: 12, alignItems: 'end', marginBottom: 16 };
const fieldStyle: React.CSSProperties = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff' };
const iconActionButtonStyle: React.CSSProperties = { minHeight: 38, padding: '8px 12px', borderRadius: 10, border: '1px solid #dbe3ef', background: '#fff', color: '#1e293b', display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontWeight: 700 };
const iconOnlyButtonStyle: React.CSSProperties = { width: 32, height: 32, borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' };
const modalOverlayStyle: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24 };
const modalStyle: React.CSSProperties = { width: 'min(820px, 100%)', maxHeight: '90vh', overflowY: 'auto', background: '#fff', borderRadius: 14, padding: 24, boxShadow: '0 20px 40px rgba(15, 23, 42, 0.25)' };
const detailsGridStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16, marginTop: 20 };

function badgeStyle(status: string): React.CSSProperties {
  const base: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', borderRadius: 999, padding: '4px 10px', fontSize: 12, fontWeight: 700 };
  switch (status) {
    case 'APPROVED': return { ...base, background: '#dcfce7', color: '#166534' };
    case 'REJECTED': return { ...base, background: '#fee2e2', color: '#991b1b' };
    case 'RETURNED': return { ...base, background: '#ffedd5', color: '#9a3412' };
    case 'CANCELLED': return { ...base, background: '#e5e7eb', color: '#374151' };
    default: return { ...base, background: '#dbeafe', color: '#1d4ed8' };
  }
}