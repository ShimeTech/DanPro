import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Edit,
  Eye,
  RefreshCcw,
  RotateCcw,
  Save,
  Send,
  Trash2,
  X,
} from 'lucide-react';

import { documentsApi } from '../../api/documents.api';
import type { ProjectDocument } from '../../api/documents.api';
import { projectsApi } from '../../api/projects.api';
import type { Project } from '../../api/projects.api';
import { submittalsApi } from '../../api/submittals.api';
import type {
  CreateSubmittalPayload,
  Submittal,
  SubmittalStatus,
} from '../../api/submittals.api';
import { Button, Card, DataTable, Input, PageHeader } from '../../components/ui';

const submittalStatuses: SubmittalStatus[] = [
  'DRAFT',
  'SUBMITTED',
  'UNDER_REVIEW',
  'APPROVED',
  'APPROVED_WITH_COMMENTS',
  'REJECTED',
  'REVISE_AND_RESUBMIT',
  'CLOSED',
];

const reviewStatuses: SubmittalStatus[] = [
  'UNDER_REVIEW',
  'APPROVED',
  'APPROVED_WITH_COMMENTS',
  'REJECTED',
  'REVISE_AND_RESUBMIT',
];

const emptyForm: CreateSubmittalPayload = {
  projectId: 0,
  title: '',
  description: '',
  status: 'DRAFT',
  revision: '',
  specificationReference: '',
  dueDate: '',
  documentId: undefined,
};

export default function SubmittalsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [submittals, setSubmittals] = useState<Submittal[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | ''>('');
  const [selectedSubmittalId, setSelectedSubmittalId] = useState<number | ''>('');
  const [selectedSubmittal, setSelectedSubmittal] =
    useState<Submittal | null>(null);
  const [editingSubmittal, setEditingSubmittal] =
    useState<Submittal | null>(null);

  const [reviewStatus, setReviewStatus] =
    useState<SubmittalStatus>('APPROVED');
  const [reviewComments, setReviewComments] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [form, setForm] = useState<CreateSubmittalPayload>(emptyForm);
  const [pageLoading, setPageLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState('');

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === Number(selectedProjectId)),
    [projects, selectedProjectId],
  );

  const filteredSubmittals = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return submittals.filter((item) => {
      const matchesKeyword =
        !keyword ||
        [
          item.code,
          item.submittalNo,
          item.title,
          item.description,
          item.specificationReference,
          item.status,
          item.revision,
          item.document?.code,
          item.rejectionReason,
        ].some((value) => String(value || '').toLowerCase().includes(keyword));

      const matchesStatus = !statusFilter || item.status === statusFilter;

      return matchesKeyword && matchesStatus;
    });
  }, [submittals, search, statusFilter]);

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
          documentId: undefined,
        });

        const [submittalData, documentData] = await Promise.all([
          submittalsApi.findByProject(firstProjectId),
          documentsApi.findByProject(firstProjectId),
        ]);

        setSubmittals(submittalData);
        setDocuments(documentData);
      } else {
        setSelectedProjectId('');
        setSubmittals([]);
        setDocuments([]);
      }
    } catch (error: any) {
      setMessage(getErrorMessage(error, 'Failed to load submittals'));
    } finally {
      setPageLoading(false);
    }
  }

  async function loadProjectData(projectId: number) {
    if (!projectId) {
      setSubmittals([]);
      setDocuments([]);
      return;
    }

    const [submittalData, documentData] = await Promise.all([
      submittalsApi.findByProject(projectId),
      documentsApi.findByProject(projectId),
    ]);

    setSubmittals(submittalData);
    setDocuments(documentData);
  }

  async function handleProjectChange(value: string) {
    try {
      setActionLoading(true);
      setMessage('');

      const projectId = Number(value);

      setSelectedProjectId(projectId || '');
      setSelectedSubmittalId('');
      setSelectedSubmittal(null);
      setEditingSubmittal(null);
      setReviewComments('');

      setForm({
        ...emptyForm,
        projectId,
        documentId: undefined,
      });

      if (projectId) {
        await loadProjectData(projectId);
      } else {
        setSubmittals([]);
        setDocuments([]);
      }
    } catch (error: any) {
      setMessage(getErrorMessage(error, 'Failed to load submittals'));
    } finally {
      setActionLoading(false);
    }
  }

  function updateField(
    name: keyof CreateSubmittalPayload,
    value: string | number | undefined,
  ) {
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function validateForm() {
    if (!form.projectId) return 'Project is required';
    if (!form.title.trim()) return 'Title is required';

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

      const payload: CreateSubmittalPayload = {
        ...form,
        projectId: Number(form.projectId),
        title: form.title.trim(),
        description: form.description?.trim() || '',
        specificationReference: form.specificationReference?.trim() || '',
        revision: form.revision?.trim().toUpperCase() || '',
        dueDate: form.dueDate || undefined,
        documentId: form.documentId ? Number(form.documentId) : undefined,
      };

      if (editingSubmittal) {
        await submittalsApi.update(editingSubmittal.id, payload);
        setMessage('Submittal updated successfully');
      } else {
        await submittalsApi.create(payload);
        setMessage('Submittal created successfully');
      }

      resetForm(Number(form.projectId));
      await loadProjectData(Number(form.projectId));
    } catch (error: any) {
      setMessage(
        getErrorMessage(
          error,
          editingSubmittal
            ? 'Failed to update submittal'
            : 'Failed to create submittal',
        ),
      );
    } finally {
      setActionLoading(false);
    }
  }

  function resetForm(projectId = Number(selectedProjectId || 0)) {
    setEditingSubmittal(null);
    setForm({
      ...emptyForm,
      projectId,
      documentId: undefined,
    });
    setMessage('');
  }

  function handleEdit(item: Submittal) {
    if (item.closedAt || item.status === 'CLOSED') {
      setMessage('Closed submittal cannot be edited. Reopen it first.');
      return;
    }

    setEditingSubmittal(item);
    setSelectedSubmittal(null);

    setForm({
      projectId: item.projectId,
      title: item.title || '',
      description: item.description || '',
      specificationReference: item.specificationReference || '',
      status: item.status || 'DRAFT',
      revision: item.revision || '',
      dueDate: toDateInputValue(item.dueDate),
      reviewerId: item.reviewerId || undefined,
      documentId: item.documentId || undefined,
    });

    setMessage('');
  }

  async function handleSubmitSubmittal(id: number) {
    const confirmed = window.confirm('Submit this submittal for review?');

    if (!confirmed) return;

    await runAction(
      () => submittalsApi.submit(id),
      'Submittal submitted successfully',
      'Failed to submit submittal',
    );
  }

  async function handleReview(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedSubmittalId) {
      setMessage('Select submittal before review');
      return;
    }

    if (reviewStatus === 'REJECTED' && !reviewComments.trim()) {
      setMessage('Rejection reason is required');
      return;
    }

    try {
      setActionLoading(true);
      setMessage('');

      await submittalsApi.review(Number(selectedSubmittalId), {
        status: reviewStatus,
        comments: reviewStatus === 'REJECTED' ? '' : reviewComments.trim(),
        rejectionReason:
          reviewStatus === 'REJECTED' ? reviewComments.trim() : undefined,
      });

      setSelectedSubmittalId('');
      setReviewStatus('APPROVED');
      setReviewComments('');
      setMessage('Submittal reviewed successfully');

      if (selectedProjectId) {
        await loadProjectData(Number(selectedProjectId));
      }
    } catch (error: any) {
      setMessage(getErrorMessage(error, 'Failed to review submittal'));
    } finally {
      setActionLoading(false);
    }
  }

  async function handleClose(id: number) {
    const confirmed = window.confirm('Close this submittal?');

    if (!confirmed) return;

    await runAction(
      () => submittalsApi.close(id),
      'Submittal closed successfully',
      'Failed to close submittal',
    );
  }

  async function handleReopen(id: number) {
    const confirmed = window.confirm('Reopen this submittal?');

    if (!confirmed) return;

    await runAction(
      () => submittalsApi.reopen(id),
      'Submittal reopened successfully',
      'Failed to reopen submittal',
    );
  }

  async function handleDelete(id: number) {
    const confirmed = window.confirm(
      'Delete this submittal? This cannot be undone.',
    );

    if (!confirmed) return;

    await runAction(
      () => submittalsApi.remove(id),
      'Submittal deleted successfully',
      'Failed to delete submittal',
    );
  }

  async function handleRefresh() {
    if (!selectedProjectId) return;

    try {
      setActionLoading(true);
      setMessage('');

      await loadProjectData(Number(selectedProjectId));
      setMessage('Submittals refreshed successfully');
    } catch (error: any) {
      setMessage(getErrorMessage(error, 'Failed to refresh submittals'));
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
        await loadProjectData(Number(selectedProjectId));
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
        title="Submittals"
        description="Manage technical submissions, shop drawings, review workflow, close-out, and audit trail."
      />

      {message && <Alert type={isSuccess ? 'success' : 'error'}>{message}</Alert>}

      {pageLoading ? (
        <SubmittalsLoading />
      ) : (
        <>
          <div style={summaryGridStyle}>
            <MetricCard label="Total Submittals" value={submittals.length} />

            <MetricCard
              label="Submitted"
              value={
                submittals.filter((item) => item.status === 'SUBMITTED').length
              }
            />

            <MetricCard
              label="Approved"
              value={
                submittals.filter(
                  (item) =>
                    item.status === 'APPROVED' ||
                    item.status === 'APPROVED_WITH_COMMENTS',
                ).length
              }
            />

            <MetricCard label="Project" value={selectedProject?.code || '-'} />
          </div>

          <div style={actionBarStyle}>
            <IconActionButton
              title="Refresh"
              onClick={handleRefresh}
              disabled={actionLoading || !selectedProjectId}
            >
              <RefreshCcw size={16} /> Refresh
            </IconActionButton>
          </div>

          <div className="module-grid">
            <div className="module-sidebar">
              <Card
                title={
                  editingSubmittal
                    ? `Edit Submittal: ${editingSubmittal.code}`
                    : 'Create Submittal'
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

                  <Input
                    label="Title"
                    value={form.title}
                    onChange={(e) => updateField('title', e.target.value)}
                    required
                  />

                  <TextareaField
                    label="Description"
                    value={form.description ?? ''}
                    disabled={actionLoading}
                    onChange={(value) => updateField('description', value)}
                  />

                  <Input
                    label="Specification Reference"
                    value={form.specificationReference ?? ''}
                    onChange={(e) =>
                      updateField('specificationReference', e.target.value)
                    }
                    placeholder="Example: Spec 03300 / Section 05 12 00"
                  />

                  <Input
                    label="Revision"
                    value={form.revision ?? ''}
                    onChange={(e) => updateField('revision', e.target.value)}
                  />

                  <Input
                    label="Due Date"
                    type="date"
                    value={form.dueDate ?? ''}
                    onChange={(e) => updateField('dueDate', e.target.value)}
                  />

                  <SelectField
                    label="Status"
                    value={form.status ?? 'DRAFT'}
                    disabled={actionLoading}
                    onChange={(value) => updateField('status', value)}
                  >
                    {submittalStatuses.map((status) => (
                      <option key={status} value={status}>
                        {status.replace(/_/g, ' ')}
                      </option>
                    ))}
                  </SelectField>

                  <SelectField
                    label="Linked Document"
                    value={form.documentId ?? ''}
                    disabled={actionLoading}
                    onChange={(value) =>
                      updateField(
                        'documentId',
                        value ? Number(value) : undefined,
                      )
                    }
                  >
                    <option value="">No linked document</option>

                    {documents.map((doc) => (
                      <option key={doc.id} value={doc.id}>
                        {doc.code} - {doc.title}
                      </option>
                    ))}
                  </SelectField>

                  <div style={{ display: 'flex', gap: 8 }}>
                    <Button disabled={actionLoading} style={{ flex: 1 }}>
                      {actionLoading ? (
                        'Saving...'
                      ) : editingSubmittal ? (
                        <>
                          <Save size={15} /> Save Changes
                        </>
                      ) : (
                        'Create Submittal'
                      )}
                    </Button>

                    {editingSubmittal && (
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

              <Card title="Review Submittal">
                <form onSubmit={handleReview} aria-busy={actionLoading}>
                  <SelectField
                    label="Submittal"
                    value={selectedSubmittalId}
                    disabled={actionLoading}
                    onChange={(value) =>
                      setSelectedSubmittalId(value ? Number(value) : '')
                    }
                  >
                    <option value="">Select submittal</option>

                    {submittals
                      .filter((item) => item.status !== 'CLOSED')
                      .map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.code} - {item.title}
                        </option>
                      ))}
                  </SelectField>

                  <SelectField
                    label="Review Status"
                    value={reviewStatus}
                    disabled={actionLoading}
                    onChange={(value) => {
                      setReviewStatus(value as SubmittalStatus);
                      setReviewComments('');
                    }}
                  >
                    {reviewStatuses.map((status) => (
                      <option key={status} value={status}>
                        {status.replace(/_/g, ' ')}
                      </option>
                    ))}
                  </SelectField>

                  {reviewStatus === 'REJECTED' ? (
                    <TextareaField
                      label="Rejection Reason"
                      value={reviewComments}
                      disabled={actionLoading}
                      onChange={setReviewComments}
                    />
                  ) : (
                    <TextareaField
                      label="Comments"
                      value={reviewComments}
                      disabled={actionLoading}
                      onChange={setReviewComments}
                    />
                  )}

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

            <Card title="Submittal Register">
              <div style={toolbarStyle}>
                <Input
                  label="Search"
                  placeholder="Search submittal no, title, document, revision..."
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

                  {submittalStatuses.map((status) => (
                    <option key={status} value={status}>
                      {status.replace(/_/g, ' ')}
                    </option>
                  ))}
                </SelectField>
              </div>

              <DataTable<Submittal>
                columns={[
                  {
                    header: 'Submittal No',
                    accessor: (row) => row.submittalNo || row.code,
                  },
                  {
                    header: 'Title',
                    accessor: 'title',
                  },
                  {
                    header: 'Spec Ref',
                    accessor: (row) => row.specificationReference || '-',
                  },
                  {
                    header: 'Revision',
                    accessor: (row) => row.revision || '-',
                  },
                  {
                    header: 'Cycle',
                    accessor: (row) => row.reviewCycle || 1,
                  },
                  {
                    header: 'Status',
                    accessor: (row) => <StatusBadge status={row.status} />,
                  },
                  {
                    header: 'Due Date',
                    accessor: (row) => formatDate(row.dueDate),
                  },
                  {
                    header: 'Document',
                    accessor: (row) => (row.document ? row.document.code : '-'),
                  },
                  {
                    header: 'Rejection Reason',
                    accessor: (row) =>
                      row.status === 'REJECTED'
                        ? row.rejectionReason || '-'
                        : '-',
                  },
                  {
                    header: 'Actions',
                    accessor: (row) => (
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <IconOnlyButton
                          title="View"
                          disabled={actionLoading}
                          onClick={() => setSelectedSubmittal(row)}
                        >
                          <Eye size={15} />
                        </IconOnlyButton>

                        {row.status !== 'CLOSED' && (
                          <IconOnlyButton
                            title="Edit"
                            disabled={actionLoading}
                            onClick={() => handleEdit(row)}
                          >
                            <Edit size={15} />
                          </IconOnlyButton>
                        )}

                        {(row.status === 'DRAFT' ||
                          row.status === 'REVISE_AND_RESUBMIT') && (
                          <IconOnlyButton
                            title="Submit"
                            disabled={actionLoading}
                            onClick={() => handleSubmitSubmittal(row.id)}
                            color="#2563eb"
                          >
                            <Send size={15} />
                          </IconOnlyButton>
                        )}

                        {row.status === 'CLOSED' || row.closedAt ? (
                          <IconOnlyButton
                            title="Reopen"
                            disabled={actionLoading}
                            onClick={() => handleReopen(row.id)}
                            color="#2563eb"
                          >
                            <RotateCcw size={15} />
                          </IconOnlyButton>
                        ) : (
                          <IconOnlyButton
                            title="Close"
                            disabled={actionLoading}
                            onClick={() => handleClose(row.id)}
                            color="#16a34a"
                          >
                            <CheckCircle2 size={15} />
                          </IconOnlyButton>
                        )}

                        {row.status !== 'CLOSED' && !row.closedAt && (
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
                data={filteredSubmittals}
                emptyMessage={
                  selectedProjectId
                    ? 'No submittals found'
                    : 'Select a project to view submittals'
                }
              />
            </Card>
          </div>
        </>
      )}

      {selectedSubmittal && (
        <SubmittalDetailsModal
          submittal={selectedSubmittal}
          onClose={() => setSelectedSubmittal(null)}
          actionLoading={actionLoading}
        />
      )}
    </div>
  );
}

function SubmittalsLoading() {
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
              animation: 'submittals-spin 0.8s linear infinite',
            }}
          />

          <div>
            <strong style={{ color: '#111827' }}>Loading submittals</strong>

            <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: 14 }}>
              Retrieving technical submissions, linked documents, review status,
              and workflow records from the server. Please wait.
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
                  minHeight: cardIndex === 0 ? 520 : 360,
                  padding: 18,
                  marginBottom: 16,
                  borderRadius: 14,
                  background: '#ffffff',
                  border: '1px solid #e5e7eb',
                }}
              >
                <Skeleton width="170px" height={18} />

                {Array.from({ length: cardIndex === 0 ? 9 : 6 }).map(
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
            @keyframes submittals-spin {
              to {
                transform: rotate(360deg);
              }
            }

            @keyframes submittals-pulse {
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
        animation: 'submittals-pulse 1.4s ease-in-out infinite',
      }}
    />
  );
}

function SubmittalDetailsModal({
  submittal,
  onClose,
  actionLoading,
}: {
  submittal: Submittal;
  onClose: () => void;
  actionLoading: boolean;
}) {
  return (
    <div style={modalOverlayStyle} role="dialog" aria-modal="true">
      <div style={modalStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
          <h2 style={{ margin: 0 }}>
            {submittal.code} - {submittal.title}
          </h2>

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
              submittal.project
                ? `${submittal.project.code} - ${submittal.project.name}`
                : '-'
            }
          />

          <Detail
            label="Submittal No"
            value={submittal.submittalNo || submittal.code}
          />

          <Detail
            label="Status"
            value={String(submittal.status).replace(/_/g, ' ')}
          />

          <Detail
            label="Specification Reference"
            value={submittal.specificationReference || '-'}
          />

          <Detail label="Revision" value={submittal.revision || '-'} />
          <Detail label="Review Cycle" value={String(submittal.reviewCycle || 1)} />
          <Detail label="Due Date" value={formatDate(submittal.dueDate)} />

          <Detail
            label="Document"
            value={
              submittal.document
                ? `${submittal.document.code} - ${submittal.document.title}`
                : '-'
            }
          />

          <Detail label="Reviewer" value={submittal.reviewer?.name || '-'} />
          <Detail label="Comments" value={submittal.comments || '-'} wide />
          <Detail
            label="Rejection Reason"
            value={submittal.rejectionReason || '-'}
            wide
          />
          <Detail label="Description" value={submittal.description || '-'} wide />
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
  return (
    <span style={badgeStyle(status || 'DRAFT')}>
      {String(status || 'DRAFT').replace(/_/g, ' ')}
    </span>
  );
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

function toDateInputValue(value?: string | null) {
  if (!value) return '';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '';

  return date.toISOString().slice(0, 10);
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
    textTransform: 'capitalize',
  };

  switch (status) {
    case 'APPROVED':
      return { ...base, background: '#dcfce7', color: '#166534' };
    case 'APPROVED_WITH_COMMENTS':
      return { ...base, background: '#dbeafe', color: '#1d4ed8' };
    case 'SUBMITTED':
      return { ...base, background: '#e0f2fe', color: '#075985' };
    case 'UNDER_REVIEW':
      return { ...base, background: '#fef9c3', color: '#854d0e' };
    case 'REJECTED':
      return { ...base, background: '#fee2e2', color: '#991b1b' };
    case 'REVISE_AND_RESUBMIT':
      return { ...base, background: '#ffedd5', color: '#9a3412' };
    case 'CLOSED':
      return { ...base, background: '#e5e7eb', color: '#374151' };
    default:
      return { ...base, background: '#f1f5f9', color: '#475569' };
  }
}