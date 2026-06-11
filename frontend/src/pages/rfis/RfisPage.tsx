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
  XCircle,
} from 'lucide-react';

import { projectsApi } from '../../api/projects.api';
import type { Project } from '../../api/projects.api';
import { rfisApi } from '../../api/rfis.api';
import type {
  CreateRfiPayload,
  Rfi,
  RfiPriority,
  RfiStatus,
} from '../../api/rfis.api';
import { Button, Card, DataTable, Input, PageHeader } from '../../components/ui';

const emptyForm: CreateRfiPayload = {
  projectId: 0,
  title: '',
  question: '',
  status: 'OPEN',
  priority: 'MEDIUM',
  dueDate: '',
};

const priorities: RfiPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
const statuses: RfiStatus[] = [
  'DRAFT',
  'OPEN',
  'ANSWERED',
  'CLOSED',
  'REJECTED',
];

export default function RfisPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [rfis, setRfis] = useState<Rfi[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | ''>('');
  const [selectedRfiId, setSelectedRfiId] = useState<number | ''>('');
  const [selectedRfi, setSelectedRfi] = useState<Rfi | null>(null);
  const [editingRfi, setEditingRfi] = useState<Rfi | null>(null);

  const [responseText, setResponseText] = useState('');
  const [responseStatus, setResponseStatus] = useState<RfiStatus>('ANSWERED');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  const [form, setForm] = useState<CreateRfiPayload>(emptyForm);
  const [pageLoading, setPageLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState('');

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === Number(selectedProjectId)),
    [projects, selectedProjectId],
  );

  const filteredRfis = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return rfis.filter((rfi) => {
      const matchesKeyword =
        !keyword ||
        [
          rfi.code,
          rfi.title,
          rfi.question,
          rfi.response,
          rfi.status,
          rfi.priority,
        ].some((value) => String(value || '').toLowerCase().includes(keyword));

      const matchesStatus = !statusFilter || rfi.status === statusFilter;
      const matchesPriority = !priorityFilter || rfi.priority === priorityFilter;

      return matchesKeyword && matchesStatus && matchesPriority;
    });
  }, [rfis, search, statusFilter, priorityFilter]);

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

        const rfiData = await rfisApi.findByProject(firstProjectId);
        setRfis(rfiData);
      } else {
        setSelectedProjectId('');
        setRfis([]);
      }
    } catch (error: any) {
      setMessage(getErrorMessage(error, 'Failed to load RFIs'));
    } finally {
      setPageLoading(false);
    }
  }

  async function loadRfis(projectId: number) {
    if (!projectId) {
      setRfis([]);
      return;
    }

    const data = await rfisApi.findByProject(projectId);
    setRfis(data);
  }

  async function handleProjectChange(value: string) {
    try {
      setActionLoading(true);
      setMessage('');

      const projectId = Number(value);

      setSelectedProjectId(projectId || '');
      setSelectedRfiId('');
      setSelectedRfi(null);
      setEditingRfi(null);
      setResponseText('');

      setForm({
        ...emptyForm,
        projectId,
      });

      if (projectId) {
        await loadRfis(projectId);
      } else {
        setRfis([]);
      }
    } catch (error: any) {
      setMessage(getErrorMessage(error, 'Failed to load RFIs'));
    } finally {
      setActionLoading(false);
    }
  }

  function updateField(name: keyof CreateRfiPayload, value: string | number) {
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function validateForm() {
    if (!form.projectId) return 'Project is required';
    if (!form.title.trim()) return 'Title is required';
    if (!form.question.trim()) return 'Question is required';

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
      setActionLoading(true);
      setMessage('');

      const payload: CreateRfiPayload = {
        ...form,
        projectId: Number(form.projectId),
        title: form.title.trim(),
        question: form.question.trim(),
        status: String(form.status || 'OPEN').toUpperCase(),
        priority: String(form.priority || 'MEDIUM').toUpperCase(),
        dueDate: form.dueDate || undefined,
      };

      if (editingRfi) {
        await rfisApi.update(editingRfi.id, payload);
        setMessage('RFI updated successfully');
      } else {
        await rfisApi.create(payload);
        setMessage('RFI created successfully');
      }

      resetForm(Number(form.projectId));
      await loadRfis(Number(form.projectId));
    } catch (error: any) {
      setMessage(
        getErrorMessage(
          error,
          editingRfi ? 'Failed to update RFI' : 'Failed to create RFI',
        ),
      );
    } finally {
      setActionLoading(false);
    }
  }

  function resetForm(projectId = Number(selectedProjectId || 0)) {
    setEditingRfi(null);
    setForm({
      ...emptyForm,
      projectId,
    });
    setMessage('');
  }

  function handleEdit(rfi: Rfi) {
    if (rfi.status === 'CLOSED') {
      setMessage('Closed RFI cannot be edited. Reopen it first.');
      return;
    }

    setEditingRfi(rfi);
    setSelectedRfi(null);

    setForm({
      projectId: rfi.projectId,
      title: rfi.title || '',
      question: rfi.question || '',
      status: rfi.status || 'OPEN',
      priority: rfi.priority || 'MEDIUM',
      assignedToId: rfi.assignedToId || undefined,
      dueDate: toDateInputValue(rfi.dueDate),
    });

    setMessage('');
  }

  async function handleRespond(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedRfiId || !responseText.trim()) {
      setMessage('Select RFI and enter response');
      return;
    }

    try {
      setActionLoading(true);
      setMessage('');

      await rfisApi.respond(Number(selectedRfiId), {
        response: responseText.trim(),
        status: responseStatus,
      });

      setSelectedRfiId('');
      setResponseText('');
      setResponseStatus('ANSWERED');
      setMessage('RFI response saved successfully');

      if (selectedProjectId) {
        await loadRfis(Number(selectedProjectId));
      }
    } catch (error: any) {
      setMessage(getErrorMessage(error, 'Failed to respond to RFI'));
    } finally {
      setActionLoading(false);
    }
  }

  async function handleClose(id: number) {
    const confirmed = window.confirm('Close this RFI?');

    if (!confirmed) return;

    await runAction(
      () => rfisApi.close(id),
      'RFI closed successfully',
      'Failed to close RFI',
    );
  }

  async function handleReopen(id: number) {
    const confirmed = window.confirm('Reopen this RFI?');

    if (!confirmed) return;

    await runAction(
      () => rfisApi.reopen(id),
      'RFI reopened successfully',
      'Failed to reopen RFI',
    );
  }

  async function handleReject(id: number) {
    const reason = window.prompt('Enter rejection reason or response');

    if (reason === null) return;

    await runAction(
      () => rfisApi.reject(id, reason),
      'RFI rejected successfully',
      'Failed to reject RFI',
    );
  }

  async function handleDelete(id: number) {
    const confirmed = window.confirm('Delete this RFI? This cannot be undone.');

    if (!confirmed) return;

    await runAction(
      () => rfisApi.remove(id),
      'RFI deleted successfully',
      'Failed to delete RFI',
    );
  }

  async function handleRefresh() {
    if (!selectedProjectId) return;

    try {
      setActionLoading(true);
      setMessage('');

      await loadRfis(Number(selectedProjectId));
      setMessage('RFIs refreshed successfully');
    } catch (error: any) {
      setMessage(getErrorMessage(error, 'Failed to refresh RFIs'));
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
        await loadRfis(Number(selectedProjectId));
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
        title="RFIs"
        description="Manage requests for information, responses, due dates, priorities, and close-out workflow."
      />

      {message && <Alert type={isSuccess ? 'success' : 'error'}>{message}</Alert>}

      {pageLoading ? (
        <RfisLoading />
      ) : (
        <>
          <div style={summaryGridStyle}>
            <MetricCard label="Total RFIs" value={rfis.length} />
            <MetricCard
              label="Open"
              value={rfis.filter((rfi) => rfi.status === 'OPEN').length}
            />
            <MetricCard
              label="Answered"
              value={rfis.filter((rfi) => rfi.status === 'ANSWERED').length}
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
              <Card title={editingRfi ? `Edit RFI: ${editingRfi.code}` : 'Create RFI'}>
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

                  <Input
                    label="Title"
                    value={form.title}
                    onChange={(e) => updateField('title', e.target.value)}
                    required
                  />

                  <TextareaField
                    label="Question"
                    value={form.question}
                    disabled={actionLoading}
                    onChange={(value) => updateField('question', value)}
                  />

                  <SelectField
                    label="Priority"
                    value={form.priority ?? 'MEDIUM'}
                    disabled={actionLoading}
                    onChange={(value) => updateField('priority', value)}
                  >
                    {priorities.map((priority) => (
                      <option key={priority} value={priority}>
                        {priority}
                      </option>
                    ))}
                  </SelectField>

                  <SelectField
                    label="Status"
                    value={form.status ?? 'OPEN'}
                    disabled={actionLoading}
                    onChange={(value) => updateField('status', value)}
                  >
                    {statuses.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </SelectField>

                  <Input
                    label="Due Date"
                    type="date"
                    value={form.dueDate || ''}
                    onChange={(e) => updateField('dueDate', e.target.value)}
                  />

                  <div style={{ display: 'flex', gap: 8 }}>
                    <Button disabled={actionLoading} style={{ flex: 1 }}>
                      {actionLoading
                        ? 'Saving...'
                        : editingRfi
                          ? (
                            <>
                              <Save size={15} /> Save Changes
                            </>
                          )
                          : 'Create RFI'}
                    </Button>

                    {editingRfi && (
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

              <Card title="Respond to RFI">
                <form onSubmit={handleRespond} aria-busy={actionLoading}>
                  <SelectField
                    label="RFI"
                    value={selectedRfiId}
                    disabled={actionLoading}
                    onChange={(value) => setSelectedRfiId(value ? Number(value) : '')}
                  >
                    <option value="">Select RFI</option>

                    {rfis
                      .filter(
                        (rfi) =>
                          rfi.status !== 'CLOSED' && rfi.status !== 'REJECTED',
                      )
                      .map((rfi) => (
                        <option key={rfi.id} value={rfi.id}>
                          {rfi.code} - {rfi.title}
                        </option>
                      ))}
                  </SelectField>

                  <TextareaField
                    label="Response"
                    value={responseText}
                    disabled={actionLoading}
                    onChange={setResponseText}
                  />

                  <SelectField
                    label="Response Status"
                    value={responseStatus}
                    disabled={actionLoading}
                    onChange={(value) => setResponseStatus(value as RfiStatus)}
                  >
                    <option value="ANSWERED">ANSWERED</option>
                    <option value="REJECTED">REJECTED</option>
                  </SelectField>

                  <Button disabled={actionLoading} style={{ width: '100%' }}>
                    {actionLoading ? (
                      'Saving...'
                    ) : (
                      <>
                        <Send size={15} /> Submit Response
                      </>
                    )}
                  </Button>
                </form>
              </Card>
            </div>

            <Card title="RFI Register">
              <div style={toolbarStyle}>
                <Input
                  label="Search"
                  placeholder="Search code, title, question, response..."
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

                  {statuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </SelectField>

                <SelectField
                  label="Priority"
                  value={priorityFilter}
                  disabled={actionLoading}
                  onChange={setPriorityFilter}
                >
                  <option value="">All priorities</option>

                  {priorities.map((priority) => (
                    <option key={priority} value={priority}>
                      {priority}
                    </option>
                  ))}
                </SelectField>
              </div>

              <DataTable<Rfi>
                columns={[
                  { header: 'Code', accessor: 'code' },
                  { header: 'Title', accessor: 'title' },
                  {
                    header: 'Priority',
                    accessor: (row) => (
                      <PriorityBadge priority={row.priority} />
                    ),
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
                    header: 'Question',
                    accessor: (row) => truncate(row.question),
                  },
                  {
                    header: 'Response',
                    accessor: (row) => truncate(row.response),
                  },
                  {
                    header: 'Actions',
                    accessor: (row) => (
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <IconOnlyButton
                          title="View"
                          disabled={actionLoading}
                          onClick={() => setSelectedRfi(row)}
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

                        {row.status !== 'CLOSED' && row.status !== 'REJECTED' && (
                          <IconOnlyButton
                            title="Reject"
                            disabled={actionLoading}
                            onClick={() => handleReject(row.id)}
                            color="#dc2626"
                          >
                            <XCircle size={15} />
                          </IconOnlyButton>
                        )}

                        {row.status === 'CLOSED' ? (
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

                        {row.status !== 'CLOSED' && (
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
                data={filteredRfis}
                emptyMessage={
                  selectedProjectId
                    ? 'No RFIs found'
                    : 'Select a project to view RFIs'
                }
              />
            </Card>
          </div>
        </>
      )}

      {selectedRfi && (
        <RfiDetailsModal
          rfi={selectedRfi}
          onClose={() => setSelectedRfi(null)}
          actionLoading={actionLoading}
        />
      )}
    </div>
  );
}

function RfisLoading() {
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
              animation: 'rfis-spin 0.8s linear infinite',
            }}
          />

          <div>
            <strong style={{ color: '#111827' }}>Loading RFIs</strong>

            <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: 14 }}>
              Retrieving requests for information, responses, priorities, due
              dates, and workflow data from the server. Please wait.
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
                  minHeight: cardIndex === 0 ? 420 : 300,
                  padding: 18,
                  marginBottom: 16,
                  borderRadius: 14,
                  background: '#ffffff',
                  border: '1px solid #e5e7eb',
                }}
              >
                <Skeleton width="150px" height={18} />

                {Array.from({ length: cardIndex === 0 ? 7 : 5 }).map(
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
            <Skeleton width="140px" height={18} />

            <div style={toolbarStyle}>
              <Skeleton width="100%" height={38} marginTop={20} />
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
            @keyframes rfis-spin {
              to {
                transform: rotate(360deg);
              }
            }

            @keyframes rfis-pulse {
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
        animation: 'rfis-pulse 1.4s ease-in-out infinite',
      }}
    />
  );
}

function RfiDetailsModal({
  rfi,
  onClose,
  actionLoading,
}: {
  rfi: Rfi;
  onClose: () => void;
  actionLoading: boolean;
}) {
  return (
    <div style={modalOverlayStyle} role="dialog" aria-modal="true">
      <div style={modalStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
          <h2 style={{ margin: 0 }}>
            {rfi.code} - {rfi.title}
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
            value={rfi.project ? `${rfi.project.code} - ${rfi.project.name}` : '-'}
          />
          <Detail label="Priority" value={rfi.priority} />
          <Detail label="Status" value={rfi.status} />
          <Detail label="Due Date" value={formatDate(rfi.dueDate)} />
          <Detail label="Created By" value={rfi.createdBy?.name || '-'} />
          <Detail label="Assigned To" value={rfi.assignedTo?.name || '-'} />
          <Detail label="Question" value={rfi.question || '-'} wide />
          <Detail label="Response" value={rfi.response || '-'} wide />
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
  return <span style={badgeStyle(status || 'OPEN')}>{status || 'OPEN'}</span>;
}

function PriorityBadge({ priority }: { priority?: string }) {
  return (
    <span style={priorityBadgeStyle(priority || 'MEDIUM')}>
      {priority || 'MEDIUM'}
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
  gridTemplateColumns: 'minmax(220px, 1fr) 180px 180px',
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
    case 'ANSWERED':
      return { ...base, background: '#dcfce7', color: '#166534' };
    case 'CLOSED':
      return { ...base, background: '#e5e7eb', color: '#374151' };
    case 'REJECTED':
      return { ...base, background: '#fee2e2', color: '#991b1b' };
    case 'DRAFT':
      return { ...base, background: '#f1f5f9', color: '#475569' };
    default:
      return { ...base, background: '#dbeafe', color: '#1d4ed8' };
  }
}

function priorityBadgeStyle(priority: string): React.CSSProperties {
  const base: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    borderRadius: 999,
    padding: '4px 10px',
    fontSize: 12,
    fontWeight: 700,
  };

  switch (priority) {
    case 'URGENT':
      return { ...base, background: '#fee2e2', color: '#991b1b' };
    case 'HIGH':
      return { ...base, background: '#ffedd5', color: '#9a3412' };
    case 'LOW':
      return { ...base, background: '#dcfce7', color: '#166534' };
    default:
      return { ...base, background: '#fef9c3', color: '#854d0e' };
  }
}