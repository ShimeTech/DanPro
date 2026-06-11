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
import type {
  Approval,
  ApprovalStatus,
  CreateApprovalPayload,
} from '../../api/approvals.api';
import { projectsApi } from '../../api/projects.api';
import type { Project } from '../../api/projects.api';
import { rfisApi } from '../../api/rfis.api';
import type { Rfi } from '../../api/rfis.api';
import { submittalsApi } from '../../api/submittals.api';
import type { Submittal } from '../../api/submittals.api';
import { Button, Card, DataTable, Input, PageHeader } from '../../components/ui';

const approvalStatuses: ApprovalStatus[] = [
  'PENDING',
  'APPROVED',
  'REJECTED',
  'RETURNED',
];

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
  const [rfis, setRfis] = useState<Rfi[]>([]);
  const [submittals, setSubmittals] = useState<Submittal[]>([]);

  const [selectedProjectId, setSelectedProjectId] = useState<number | ''>('');
  const [selectedApprovalId, setSelectedApprovalId] = useState<number | ''>('');
  const [selectedApproval, setSelectedApproval] = useState<Approval | null>(null);
  const [editingApproval, setEditingApproval] = useState<Approval | null>(null);

  const [reviewStatus, setReviewStatus] = useState<ApprovalStatus>('APPROVED');
  const [reviewComments, setReviewComments] = useState('');
  const [approvalTarget, setApprovalTarget] = useState('');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [form, setForm] = useState<CreateApprovalPayload>(emptyForm);
  const [pageLoading, setPageLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState('');

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === Number(selectedProjectId)),
    [projects, selectedProjectId],
  );

  const filteredApprovals = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return approvals.filter((approval) => {
      const matchesKeyword =
        !keyword ||
        [
          approval.module,
          approval.entityName,
          approval.entityId,
          approval.status,
          approval.comments,
          approval.user?.name,
        ].some((value) => String(value || '').toLowerCase().includes(keyword));

      const matchesStatus = !statusFilter || approval.status === statusFilter;

      return matchesKeyword && matchesStatus;
    });
  }, [approvals, search, statusFilter]);

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

        const [approvalData, rfiData, submittalData] = await Promise.all([
          approvalsApi.findByProject(firstProjectId),
          rfisApi.findByProject(firstProjectId),
          submittalsApi.findByProject(firstProjectId),
        ]);

        setApprovals(approvalData);
        setRfis(rfiData);
        setSubmittals(submittalData);
      } else {
        setSelectedProjectId('');
        setApprovals([]);
        setRfis([]);
        setSubmittals([]);
      }
    } catch (error: any) {
      setMessage(getErrorMessage(error, 'Failed to load approvals'));
    } finally {
      setPageLoading(false);
    }
  }

  async function loadApprovals(projectId: number) {
    if (!projectId) {
      setApprovals([]);
      setRfis([]);
      setSubmittals([]);
      return;
    }

    const [approvalData, rfiData, submittalData] = await Promise.all([
      approvalsApi.findByProject(projectId),
      rfisApi.findByProject(projectId),
      submittalsApi.findByProject(projectId),
    ]);

    setApprovals(approvalData);
    setRfis(rfiData);
    setSubmittals(submittalData);
  }

  async function handleProjectChange(value: string) {
    try {
      setActionLoading(true);
      setMessage('');

      const projectId = Number(value);

      setSelectedProjectId(projectId || '');
      setSelectedApprovalId('');
      setSelectedApproval(null);
      setEditingApproval(null);
      setApprovalTarget('');

      setForm({
        ...emptyForm,
        projectId,
      });

      if (projectId) {
        await loadApprovals(projectId);
      } else {
        setApprovals([]);
        setRfis([]);
        setSubmittals([]);
      }
    } catch (error: any) {
      setMessage(getErrorMessage(error, 'Failed to load approvals'));
    } finally {
      setActionLoading(false);
    }
  }

  function updateField(
    name: keyof CreateApprovalPayload,
    value: string | number | null,
  ) {
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
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
      setActionLoading(true);
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
      setMessage(
        getErrorMessage(
          error,
          editingApproval
            ? 'Failed to update approval'
            : 'Failed to create approval',
        ),
      );
    } finally {
      setActionLoading(false);
    }
  }

  function resetForm(projectId = Number(selectedProjectId || 0)) {
    setEditingApproval(null);
    setApprovalTarget('');

    setForm({
      ...emptyForm,
      projectId,
    });

    setMessage('');
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

    setMessage('');
  }

  async function handleReview(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedApprovalId) {
      setMessage('Select approval first');
      return;
    }

    try {
      setActionLoading(true);
      setMessage('');

      await approvalsApi.review(Number(selectedApprovalId), {
        status: reviewStatus,
        comments: reviewComments.trim(),
      });

      setSelectedApprovalId('');
      setReviewStatus('APPROVED');
      setReviewComments('');
      setMessage('Approval reviewed successfully');

      if (selectedProjectId) {
        await loadApprovals(Number(selectedProjectId));
      }
    } catch (error: any) {
      setMessage(getErrorMessage(error, 'Failed to review approval'));
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCancel(id: number) {
    const confirmed = window.confirm('Cancel/return this approval?');

    if (!confirmed) return;

    await runAction(
      () => approvalsApi.cancel(id),
      'Approval cancelled successfully',
      'Failed to cancel approval',
    );
  }

  async function handleReopen(id: number) {
    const confirmed = window.confirm('Reopen this approval?');

    if (!confirmed) return;

    await runAction(
      () => approvalsApi.reopen(id),
      'Approval reopened successfully',
      'Failed to reopen approval',
    );
  }

  async function handleDelete(id: number) {
    const confirmed = window.confirm(
      'Delete this approval? This cannot be undone.',
    );

    if (!confirmed) return;

    await runAction(
      () => approvalsApi.remove(id),
      'Approval deleted successfully',
      'Failed to delete approval',
    );
  }

  async function handleRefresh() {
    if (!selectedProjectId) return;

    try {
      setActionLoading(true);
      setMessage('');

      await loadApprovals(Number(selectedProjectId));
      setMessage('Approvals refreshed successfully');
    } catch (error: any) {
      setMessage(getErrorMessage(error, 'Failed to refresh approvals'));
    } finally {
      setActionLoading(false);
    }
  }

  async function runAction(
    action: () => Promise<any>,
    successMessage: string,
    fallbackError: string,
  ) {
    try {
      setActionLoading(true);
      setMessage('');

      await action();
      setMessage(successMessage);

      if (selectedProjectId) {
        await loadApprovals(Number(selectedProjectId));
      }
    } catch (error: any) {
      setMessage(getErrorMessage(error, fallbackError));
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Approvals"
        description="Create, edit, review, approve, reject, return, reopen, and audit workflow approvals."
      />

      {message && <Alert type={isSuccess ? 'success' : 'error'}>{message}</Alert>}

      {pageLoading ? (
        <ApprovalsLoading />
      ) : (
        <>
          <div style={summaryGridStyle}>
            <MetricCard label="Total Approvals" value={approvals.length} />
            <MetricCard
              label="Pending"
              value={approvals.filter((item) => item.status === 'PENDING').length}
            />
            <MetricCard
              label="Approved"
              value={approvals.filter((item) => item.status === 'APPROVED').length}
            />
            <MetricCard label="Project" value={selectedProject?.code || '-'} />
          </div>

          <div style={actionBarStyle}>
            <IconActionButton
              title="Refresh"
              disabled={actionLoading || !selectedProjectId}
              onClick={handleRefresh}
            >
              <RefreshCcw size={16} /> Refresh
            </IconActionButton>
          </div>

          <div className="module-grid">
            <div className="module-sidebar">
              <Card
                title={
                  editingApproval
                    ? `Edit Approval #${editingApproval.id}`
                    : 'Create Approval'
                }
              >
                <form onSubmit={handleSubmitForm} aria-busy={actionLoading}>
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
                    label="Approval Target"
                    value={approvalTarget}
                    disabled={actionLoading}
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
                        <option
                          key={`submittal-${submittal.id}`}
                          value={`submittals:${submittal.id}`}
                        >
                          {submittal.code} - {submittal.title}
                        </option>
                      ))}
                    </optgroup>
                  </SelectField>

                  <SelectField
                    label="Status"
                    value={form.status ?? 'PENDING'}
                    disabled={actionLoading}
                    onChange={(value) => updateField('status', value)}
                  >
                    {approvalStatuses.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </SelectField>

                  <TextareaField
                    label="Comments"
                    value={form.comments ?? ''}
                    disabled={actionLoading}
                    onChange={(value) => updateField('comments', value)}
                  />

                  <div style={{ display: 'flex', gap: 8 }}>
                    <Button disabled={actionLoading} style={{ flex: 1 }}>
                      {actionLoading ? (
                        'Saving...'
                      ) : editingApproval ? (
                        <>
                          <Save size={15} /> Save Changes
                        </>
                      ) : (
                        'Create Approval'
                      )}
                    </Button>

                    {editingApproval && (
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => resetForm()}
                        disabled={actionLoading}
                      >
                        <X size={15} /> Cancel
                      </Button>
                    )}
                  </div>
                </form>
              </Card>

              <Card title="Review Approval">
                <form onSubmit={handleReview} aria-busy={actionLoading}>
                  <SelectField
                    label="Approval"
                    value={selectedApprovalId}
                    disabled={actionLoading}
                    onChange={(value) =>
                      setSelectedApprovalId(value ? Number(value) : '')
                    }
                  >
                    <option value="">Select approval</option>

                    {approvals
                      .filter((approval) => approval.status === 'PENDING')
                      .map((approval) => (
                        <option key={approval.id} value={approval.id}>
                          #{approval.id} - {approval.module}:{approval.entityName}:
                          {approval.entityId}
                        </option>
                      ))}
                  </SelectField>

                  <SelectField
                    label="Review Status"
                    value={reviewStatus}
                    disabled={actionLoading}
                    onChange={(value) => setReviewStatus(value as ApprovalStatus)}
                  >
                    {reviewStatuses.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </SelectField>

                  <TextareaField
                    label="Review Comments"
                    value={reviewComments}
                    disabled={actionLoading}
                    onChange={setReviewComments}
                  />

                  <Button disabled={actionLoading} style={{ width: '100%' }}>
                    {actionLoading ? (
                      'Saving...'
                    ) : (
                      <>
                        <CheckCircle2 size={15} /> Save Review
                      </>
                    )}
                  </Button>
                </form>
              </Card>
            </div>

            <Card title="Approval Register">
              <div style={toolbarStyle}>
                <Input
                  label="Search"
                  placeholder="Search module, entity, reviewer, comments..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />

                <SelectField
                  label="Status"
                  value={statusFilter}
                  disabled={actionLoading}
                  onChange={setStatusFilter}
                >
                  <option value="">All statuses</option>

                  {approvalStatuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </SelectField>
              </div>

              <DataTable<Approval>
                columns={[
                  { header: 'ID', accessor: (row) => `#${row.id}` },
                  { header: 'Module', accessor: 'module' },
                  {
                    header: 'Entity',
                    accessor: (row) => `${row.entityName} #${row.entityId}`,
                  },
                  {
                    header: 'Status',
                    accessor: (row) => <StatusBadge status={row.status} />,
                  },
                  {
                    header: 'Reviewer',
                    accessor: (row) => row.user?.name || '-',
                  },
                  {
                    header: 'Approved At',
                    accessor: (row) => formatDate(row.approvedAt),
                  },
                  {
                    header: 'Comments',
                    accessor: (row) => truncate(row.comments),
                  },
                  {
                    header: 'Actions',
                    accessor: (row) => (
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <IconOnlyButton
                          title="View"
                          disabled={actionLoading}
                          onClick={() => setSelectedApproval(row)}
                        >
                          <Eye size={15} />
                        </IconOnlyButton>

                        {row.status === 'PENDING' && (
                          <IconOnlyButton
                            title="Edit"
                            disabled={actionLoading}
                            onClick={() => handleEdit(row)}
                          >
                            <Edit size={15} />
                          </IconOnlyButton>
                        )}

                        {row.status === 'PENDING' && (
                          <IconOnlyButton
                            title="Approve"
                            disabled={actionLoading}
                            onClick={() =>
                              runAction(
                                () =>
                                  approvalsApi.review(row.id, {
                                    status: 'APPROVED',
                                    comments: row.comments || '',
                                  }),
                                'Approval approved successfully',
                                'Failed to approve',
                              )
                            }
                            color="#16a34a"
                          >
                            <CheckCircle2 size={15} />
                          </IconOnlyButton>
                        )}

                        {row.status === 'PENDING' && (
                          <IconOnlyButton
                            title="Reject"
                            disabled={actionLoading}
                            onClick={() =>
                              runAction(
                                () =>
                                  approvalsApi.review(row.id, {
                                    status: 'REJECTED',
                                    comments: row.comments || '',
                                  }),
                                'Approval rejected successfully',
                                'Failed to reject',
                              )
                            }
                            color="#dc2626"
                          >
                            <XCircle size={15} />
                          </IconOnlyButton>
                        )}

                        {row.status === 'PENDING' && (
                          <IconOnlyButton
                            title="Return/Cancel"
                            disabled={actionLoading}
                            onClick={() => handleCancel(row.id)}
                          >
                            <X size={15} />
                          </IconOnlyButton>
                        )}

                        {row.status !== 'PENDING' && (
                          <IconOnlyButton
                            title="Reopen"
                            disabled={actionLoading}
                            onClick={() => handleReopen(row.id)}
                            color="#2563eb"
                          >
                            <RotateCcw size={15} />
                          </IconOnlyButton>
                        )}

                        {row.status !== 'APPROVED' && (
                          <IconOnlyButton
                            title="Delete"
                            disabled={actionLoading}
                            onClick={() => handleDelete(row.id)}
                            color="#dc2626"
                          >
                            <Trash2 size={15} />
                          </IconOnlyButton>
                        )}
                      </div>
                    ),
                  },
                ]}
                data={filteredApprovals}
                emptyMessage={
                  selectedProjectId
                    ? 'No approvals found'
                    : 'Select a project to view approvals'
                }
              />
            </Card>
          </div>
        </>
      )}

      {selectedApproval && (
        <ApprovalDetailsModal
          approval={selectedApproval}
          onClose={() => setSelectedApproval(null)}
          actionLoading={actionLoading}
        />
      )}
    </div>
  );
}

function ApprovalsLoading() {
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
              animation: 'approvals-spin 0.8s linear infinite',
            }}
          />

          <div>
            <strong style={{ color: '#111827' }}>Loading approvals</strong>

            <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: 14 }}>
              Retrieving approval workflows, RFIs, submittals, reviewers, and
              review history from the server. Please wait.
            </p>
          </div>
        </div>

        <div style={summaryGridStyle}>
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} style={metricCardStyle}>
              <Skeleton width="60%" height={13} />
              <Skeleton width="40%" height={28} marginTop={12} />
            </div>
          ))}
        </div>

        <div style={actionBarStyle}>
          <Skeleton width="110px" height={38} />
        </div>

        <div className="module-grid">
          <div className="module-sidebar">
            {Array.from({ length: 2 }).map((_, cardIndex) => (
              <div
                key={cardIndex}
                style={{
                  minHeight: cardIndex === 0 ? 380 : 300,
                  padding: 18,
                  marginBottom: 16,
                  borderRadius: 14,
                  background: '#ffffff',
                  border: '1px solid #e5e7eb',
                }}
              >
                <Skeleton width="170px" height={18} />

                {Array.from({ length: cardIndex === 0 ? 6 : 5 }).map(
                  (_, index) => (
                    <Skeleton
                      key={index}
                      width="100%"
                      height={36}
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

            <div style={toolbarStyle}>
              <Skeleton width="100%" height={38} marginTop={20} />
              <Skeleton width="100%" height={38} marginTop={20} />
            </div>

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
            @keyframes approvals-spin {
              to {
                transform: rotate(360deg);
              }
            }

            @keyframes approvals-pulse {
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
        animation: 'approvals-pulse 1.4s ease-in-out infinite',
      }}
    />
  );
}

function ApprovalDetailsModal({
  approval,
  onClose,
  actionLoading,
}: {
  approval: Approval;
  onClose: () => void;
  actionLoading: boolean;
}) {
  return (
    <div style={modalOverlayStyle} role="dialog" aria-modal="true">
      <div style={modalStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
          <h2 style={{ margin: 0 }}>Approval #{approval.id}</h2>

          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={actionLoading}
          >
            <X size={15} /> Close
          </Button>
        </div>

        <div style={detailsGridStyle}>
          <Detail
            label="Project"
            value={
              approval.project
                ? `${approval.project.code} - ${approval.project.name}`
                : '-'
            }
          />
          <Detail label="Status" value={approval.status} />
          <Detail label="Module" value={approval.module} />
          <Detail
            label="Entity"
            value={`${approval.entityName} #${approval.entityId}`}
          />
          <Detail label="Reviewer" value={approval.user?.name || '-'} />
          <Detail label="Approved At" value={formatDate(approval.approvedAt)} />
          <Detail label="Comments" value={approval.comments || '-'} wide />
        </div>
      </div>
    </div>
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

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={metricCardStyle}>
      <div style={{ color: '#64748b', fontSize: 13 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 800 }}>{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status?: string }) {
  return <span style={badgeStyle(status || 'PENDING')}>{status || 'PENDING'}</span>;
}

function IconActionButton({
  children,
  title,
  onClick,
  disabled = false,
}: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      style={{
        ...iconActionButtonStyle,
        opacity: disabled ? 0.6 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      {children}
    </button>
  );
}

function IconOnlyButton({
  children,
  title,
  onClick,
  color,
  disabled = false,
}: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
  color?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      style={{
        ...iconOnlyButtonStyle,
        color: color || '#334155',
        opacity: disabled ? 0.6 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      {children}
    </button>
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
          ...fieldStyle,
          background: disabled ? '#f3f4f6' : '#ffffff',
          cursor: disabled ? 'not-allowed' : 'pointer',
        }}
      >
        {children}
      </select>
    </div>
  );
}

function TextareaField({
  label,
  value,
  onChange,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>
        {label}
      </label>

      <textarea
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        style={{
          ...fieldStyle,
          resize: 'vertical',
          background: disabled ? '#f3f4f6' : '#ffffff',
          cursor: disabled ? 'not-allowed' : 'text',
        }}
      />
    </div>
  );
}

function Detail({
  label,
  value,
  wide,
}: {
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <div style={{ gridColumn: wide ? '1 / -1' : undefined }}>
      <div style={{ color: '#64748b', fontSize: 13, marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontWeight: 600, whiteSpace: 'pre-wrap' }}>{value}</div>
    </div>
  );
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

function truncate(value?: string | null) {
  if (!value) return '-';

  return value.length > 50 ? `${value.slice(0, 50)}...` : value;
}

function getErrorMessage(error: any, fallback: string) {
  return error?.response?.data?.message || error?.message || fallback;
}

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

const actionBarStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  flexWrap: 'wrap',
  gap: 8,
  marginBottom: 16,
};

const toolbarStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(220px, 1fr) 180px',
  gap: 12,
  alignItems: 'end',
  marginBottom: 16,
};

const fieldStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 8,
  border: '1px solid #d1d5db',
};

const iconActionButtonStyle: React.CSSProperties = {
  minHeight: 38,
  padding: '8px 12px',
  borderRadius: 10,
  border: '1px solid #dbe3ef',
  background: '#fff',
  color: '#1e293b',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  fontWeight: 700,
};

const iconOnlyButtonStyle: React.CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: 8,
  border: '1px solid #e2e8f0',
  background: '#fff',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
};

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
  width: 'min(820px, 100%)',
  maxHeight: '90vh',
  overflowY: 'auto',
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
  };

  switch (status) {
    case 'APPROVED':
      return { ...base, background: '#dcfce7', color: '#166534' };
    case 'REJECTED':
      return { ...base, background: '#fee2e2', color: '#991b1b' };
    case 'RETURNED':
      return { ...base, background: '#ffedd5', color: '#9a3412' };
    case 'CANCELLED':
      return { ...base, background: '#e5e7eb', color: '#374151' };
    default:
      return { ...base, background: '#dbeafe', color: '#1d4ed8' };
  }
}