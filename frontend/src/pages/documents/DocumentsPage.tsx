import { useEffect, useMemo, useState } from 'react';
import {
  Download,
  Edit,
  Eye,
  FileUp,
  RefreshCcw,
  Save,
  Settings2,
  Upload,
  X,
} from 'lucide-react';

import { documentsApi } from '../../api/documents.api';
import type {
  CreateDocumentPayload,
  DocumentStatus,
  DocumentType,
  ProjectDocument,
} from '../../api/documents.api';
import { projectsApi } from '../../api/projects.api';
import type { Project } from '../../api/projects.api';
import { Button, Card, DataTable, Input, PageHeader } from '../../components/ui';

const documentTypes: DocumentType[] = [
  'DRAWING',
  'RFI',
  'SUBMITTAL',
  'METHOD_STATEMENT',
  'INSPECTION_REQUEST',
  'CONTRACT',
  'REPORT',
  'OTHER',
];

const documentStatuses: DocumentStatus[] = [
  'WIP',
  'SHARED',
  'PUBLISHED',
  'ARCHIVED',
  'REJECTED',
];

const emptyForm: CreateDocumentPayload = {
  projectId: 0,
  code: '',
  title: '',
  type: 'DRAWING',
  discipline: '',
  originator: '',
  zone: '',
  level: '',
  status: 'WIP',
  currentRevision: '',
  description: '',
};

export default function DocumentsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | ''>('');
  const [selectedDocumentId, setSelectedDocumentId] = useState<number | ''>('');
  const [selectedDocument, setSelectedDocument] =
    useState<ProjectDocument | null>(null);
  const [editingDocument, setEditingDocument] =
    useState<ProjectDocument | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [revision, setRevision] = useState('');
  const [versionStatus, setVersionStatus] = useState<DocumentStatus>('WIP');
  const [versionNotes, setVersionNotes] = useState('');
  const [search, setSearch] = useState('');

  const [statusModalDocument, setStatusModalDocument] =
    useState<ProjectDocument | null>(null);
  const [statusModalValue, setStatusModalValue] =
    useState<DocumentStatus>('WIP');
  const [statusRejectionReason, setStatusRejectionReason] = '';

  const [form, setForm] = useState<CreateDocumentPayload>(emptyForm);
  const [pageLoading, setPageLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState('');

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === Number(selectedProjectId)),
    [projects, selectedProjectId],
  );

  const filteredDocuments = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) return documents;

    return documents.filter((doc) =>
      [
        doc.code,
        doc.title,
        doc.type,
        doc.status,
        doc.currentRevision,
        doc.discipline,
        doc.originator,
      ].some((value) => String(value || '').toLowerCase().includes(keyword)),
    );
  }, [documents, search]);

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

        const documentData = await documentsApi.findByProject(firstProjectId);
        setDocuments(documentData);
      } else {
        setSelectedProjectId('');
        setDocuments([]);
      }
    } catch (error: any) {
      setMessage(getErrorMessage(error, 'Failed to load documents'));
    } finally {
      setPageLoading(false);
    }
  }

  async function loadDocuments(projectId: number) {
    if (!projectId) {
      setDocuments([]);
      return;
    }

    const data = await documentsApi.findByProject(projectId);
    setDocuments(data);
  }

  async function handleProjectChange(value: string) {
    try {
      setActionLoading(true);
      setMessage('');

      const projectId = Number(value);

      setSelectedProjectId(projectId || '');
      setSelectedDocumentId('');
      setSelectedDocument(null);
      setEditingDocument(null);

      setForm({
        ...emptyForm,
        projectId,
      });

      if (projectId) {
        await loadDocuments(projectId);
      } else {
        setDocuments([]);
      }
    } catch (error: any) {
      setMessage(getErrorMessage(error, 'Failed to load documents'));
    } finally {
      setActionLoading(false);
    }
  }

  function updateField(
    name: keyof CreateDocumentPayload,
    value: string | number,
  ) {
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function validateDocumentForm() {
    if (!form.projectId) return 'Project is required';
    if (!form.code.trim()) return 'Document code is required';
    if (!form.title.trim()) return 'Title is required';

    return '';
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const validationError = validateDocumentForm();

    if (validationError) {
      setMessage(validationError);
      return;
    }

    try {
      setActionLoading(true);
      setMessage('');

      const payload: CreateDocumentPayload = {
        ...form,
        projectId: Number(form.projectId),
        code: form.code.trim().toUpperCase(),
        title: form.title.trim(),
        discipline: form.discipline?.trim() || '',
        originator: form.originator?.trim() || '',
        zone: form.zone?.trim() || '',
        level: form.level?.trim() || '',
        currentRevision: form.currentRevision?.trim().toUpperCase() || '',
        description: form.description?.trim() || '',
      };

      if (editingDocument) {
        await documentsApi.update(editingDocument.id, payload);
        setMessage('Document updated successfully');
      } else {
        await documentsApi.create(payload);
        setMessage('Document created successfully');
      }

      resetDocumentForm(Number(form.projectId));
      await loadDocuments(Number(form.projectId));
    } catch (error: any) {
      setMessage(
        getErrorMessage(
          error,
          editingDocument ? 'Failed to update document' : 'Failed to create document',
        ),
      );
    } finally {
      setActionLoading(false);
    }
  }

  function resetDocumentForm(projectId = Number(selectedProjectId || 0)) {
    setEditingDocument(null);
    setForm({
      ...emptyForm,
      projectId,
    });
    setMessage('');
  }

  function handleEdit(doc: ProjectDocument) {
    setEditingDocument(doc);
    setSelectedDocument(null);

    setForm({
      projectId: doc.projectId,
      code: doc.code || '',
      title: doc.title || '',
      type: doc.type,
      discipline: doc.discipline || '',
      originator: doc.originator || '',
      zone: doc.zone || '',
      level: doc.level || '',
      status: doc.status,
      currentRevision: doc.currentRevision || '',
      description: doc.description || '',
    });

    setMessage('');
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedDocumentId) {
      setMessage('Select document before upload');
      return;
    }

    if (!selectedFile) {
      setMessage('Select file before upload');
      return;
    }

    try {
      setActionLoading(true);
      setMessage('');

      await documentsApi.uploadVersion(Number(selectedDocumentId), {
        file: selectedFile,
        revision: revision.trim() || undefined,
        status: versionStatus,
        notes: versionNotes.trim(),
      });

      setSelectedFile(null);
      setRevision('');
      setVersionStatus('WIP');
      setVersionNotes('');

      const fileInput = document.getElementById(
        'document-file',
      ) as HTMLInputElement | null;

      if (fileInput) {
        fileInput.value = '';
      }

      setMessage('Document version uploaded successfully');

      if (selectedProjectId) {
        await loadDocuments(Number(selectedProjectId));
      }
    } catch (error: any) {
      setMessage(getErrorMessage(error, 'Failed to upload file'));
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDownload(versionId: number, fallbackFileName?: string) {
    try {
      setActionLoading(true);
      setMessage('');

      const token = localStorage.getItem('accessToken');

      const response = await fetch(documentsApi.getDownloadUrl(versionId), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.message || 'Download failed');
      }

      const disposition = response.headers.get('Content-Disposition');
      const fileName =
        getFileNameFromDisposition(disposition) ||
        fallbackFileName ||
        `document-version-${versionId}`;

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');

      link.href = url;
      link.download = fileName;

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      setMessage(error.message || 'Failed to download file');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleArchive(id: number) {
    const confirmed = window.confirm('Archive this document?');

    if (!confirmed) return;

    try {
      setActionLoading(true);
      setMessage('');

      await documentsApi.archive(id);
      setMessage('Document archived successfully');

      if (selectedProjectId) {
        await loadDocuments(Number(selectedProjectId));
      }
    } catch (error: any) {
      setMessage(getErrorMessage(error, 'Failed to archive document'));
    } finally {
      setActionLoading(false);
    }
  }

  function handleChangeStatus(doc: ProjectDocument) {
    setStatusModalDocument(doc);
    setStatusModalValue(doc.status);
    setStatusRejectionReason(doc.rejectionReason || '');
  }

  async function handleConfirmStatusChange() {
    if (!statusModalDocument) return;

    if (statusModalValue === 'REJECTED' && !statusRejectionReason.trim()) {
      setMessage('Rejection reason is required');
      return;
    }

    try {
      setActionLoading(true);
      setMessage('');

      await documentsApi.changeStatus(statusModalDocument.id, {
        status: statusModalValue,
        rejectionReason:
          statusModalValue === 'REJECTED'
            ? statusRejectionReason.trim()
            : undefined,
      });

      setMessage('Document status updated successfully');
      setStatusModalDocument(null);
      setStatusRejectionReason('');

      if (selectedProjectId) {
        await loadDocuments(Number(selectedProjectId));
      }
    } catch (error: any) {
      setMessage(getErrorMessage(error, 'Failed to update document status'));
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRefresh() {
    if (!selectedProjectId) return;

    try {
      setActionLoading(true);
      setMessage('');

      await loadDocuments(Number(selectedProjectId));
      setMessage('Documents refreshed successfully');
    } catch (error: any) {
      setMessage(getErrorMessage(error, 'Failed to refresh documents'));
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Documents"
        description="Manage ISO 19650-style controlled documents, revisions, uploads, approvals, and secure downloads."
      />

      {message && <Alert type={isSuccess ? 'success' : 'error'}>{message}</Alert>}

      {pageLoading ? (
        <DocumentsLoading />
      ) : (
        <>
          <div style={summaryGridStyle}>
            <MetricCard label="Total Documents" value={documents.length} />
            <MetricCard
              label="Published"
              value={documents.filter((doc) => doc.status === 'PUBLISHED').length}
            />
            <MetricCard
              label="Shared"
              value={documents.filter((doc) => doc.status === 'SHARED').length}
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
                  editingDocument
                    ? `Edit Document: ${editingDocument.code}`
                    : 'Create Document'
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

                  <Input
                    label="Document Code"
                    value={form.code}
                    onChange={(e) => updateField('code', e.target.value)}
                    required
                  />

                  <Input
                    label="Title"
                    value={form.title}
                    onChange={(e) => updateField('title', e.target.value)}
                    required
                  />

                  <SelectField
                    label="Type"
                    value={form.type}
                    disabled={actionLoading}
                    onChange={(value) => updateField('type', value)}
                  >
                    {documentTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </SelectField>

                  <Input
                    label="Discipline"
                    value={form.discipline}
                    onChange={(e) => updateField('discipline', e.target.value)}
                  />

                  <Input
                    label="Originator"
                    value={form.originator}
                    onChange={(e) => updateField('originator', e.target.value)}
                  />

                  <Input
                    label="Zone"
                    value={form.zone}
                    onChange={(e) => updateField('zone', e.target.value)}
                  />

                  <Input
                    label="Level"
                    value={form.level}
                    onChange={(e) => updateField('level', e.target.value)}
                  />

                  <SelectField
                    label="Status"
                    value={form.status ?? 'WIP'}
                    disabled={actionLoading}
                    onChange={(value) => updateField('status', value)}
                  >
                    {documentStatuses.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </SelectField>

                  <Input
                    label="Current Revision"
                    placeholder="P01 / C01"
                    value={form.currentRevision}
                    onChange={(e) =>
                      updateField('currentRevision', e.target.value)
                    }
                  />

                  <TextAreaField
                    label="Description"
                    value={form.description || ''}
                    disabled={actionLoading}
                    onChange={(value) => updateField('description', value)}
                  />

                  <div style={{ display: 'flex', gap: 8 }}>
                    <Button disabled={actionLoading} style={{ flex: 1 }}>
                      {actionLoading
                        ? 'Saving...'
                        : editingDocument
                          ? (
                            <>
                              <Save size={15} /> Save Changes
                            </>
                          )
                          : 'Create Document'}
                    </Button>

                    {editingDocument && (
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => resetDocumentForm()}
                        disabled={actionLoading}
                      >
                        <X size={15} /> Cancel
                      </Button>
                    )}
                  </div>
                </form>
              </Card>

              <Card title="Upload Version">
                <form onSubmit={handleUpload} aria-busy={actionLoading}>
                  <SelectField
                    label="Document"
                    value={selectedDocumentId}
                    disabled={actionLoading}
                    onChange={(value) =>
                      setSelectedDocumentId(value ? Number(value) : '')
                    }
                  >
                    <option value="">Select document</option>

                    {documents.map((doc) => (
                      <option key={doc.id} value={doc.id}>
                        {doc.code} - {doc.title}
                      </option>
                    ))}
                  </SelectField>

                  <Input
                    label="Revision"
                    placeholder="Auto-generated if empty, e.g. P01 / P02 / C01"
                    value={revision}
                    onChange={(e) => setRevision(e.target.value)}
                  />

                  <SelectField
                    label="Version Status"
                    value={versionStatus}
                    disabled={actionLoading}
                    onChange={(value) => setVersionStatus(value as DocumentStatus)}
                  >
                    {documentStatuses.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </SelectField>

                  <Input
                    label="Notes"
                    value={versionNotes}
                    onChange={(e) => setVersionNotes(e.target.value)}
                  />

                  <div style={{ marginBottom: 12 }}>
                    <label
                      style={{
                        display: 'block',
                        marginBottom: 6,
                        fontWeight: 600,
                      }}
                    >
                      File
                    </label>

                    <input
                      id="document-file"
                      type="file"
                      disabled={actionLoading}
                      onChange={(e) =>
                        setSelectedFile(e.target.files ? e.target.files[0] : null)
                      }
                    />
                  </div>

                  <Button disabled={actionLoading} style={{ width: '100%' }}>
                    {actionLoading ? (
                      'Uploading...'
                    ) : (
                      <>
                        <Upload size={15} /> Upload Version
                      </>
                    )}
                  </Button>
                </form>
              </Card>
            </div>

            <Card title="Document Register">
              <div style={toolbarStyle}>
                <Input
                  label="Search"
                  placeholder="Search code, title, type, status..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <DataTable<ProjectDocument>
                columns={[
                  { header: 'Code', accessor: 'code' },
                  { header: 'Title', accessor: 'title' },
                  { header: 'Type', accessor: 'type' },
                  {
                    header: 'Status',
                    accessor: (row) => <StatusBadge status={row.status} />,
                  },
                  {
                    header: 'Rejection Reason',
                    accessor: (row) =>
                      row.status === 'REJECTED'
                        ? row.rejectionReason || '-'
                        : '-',
                  },
                  {
                    header: 'Revision',
                    accessor: (row) => row.currentRevision || '-',
                  },
                  {
                    header: 'Versions',
                    accessor: (row) => row.versions?.length ?? 0,
                  },
                  {
                    header: 'Actions',
                    accessor: (row) => {
                      const latest = row.versions?.[0];

                      return (
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <IconOnlyButton
                            title="View Details"
                            disabled={actionLoading}
                            onClick={() => setSelectedDocument(row)}
                          >
                            <Eye size={15} />
                          </IconOnlyButton>

                          <IconOnlyButton
                            title="Edit"
                            disabled={actionLoading}
                            onClick={() => handleEdit(row)}
                          >
                            <Edit size={15} />
                          </IconOnlyButton>

                          <IconOnlyButton
                            title="Change Status"
                            disabled={actionLoading}
                            onClick={() => handleChangeStatus(row)}
                          >
                            <Settings2 size={15} />
                          </IconOnlyButton>

                          {latest ? (
                            <IconOnlyButton
                              title="Download Latest"
                              disabled={actionLoading}
                              onClick={() =>
                                handleDownload(latest.id, latest.fileName)
                              }
                              color="#2563eb"
                            >
                              <Download size={15} />
                            </IconOnlyButton>
                          ) : (
                            <IconOnlyButton
                              title="No File Uploaded"
                              disabled={actionLoading}
                              onClick={() =>
                                setMessage('No file uploaded for this document')
                              }
                            >
                              <FileUp size={15} />
                            </IconOnlyButton>
                          )}
                        </div>
                      );
                    },
                  },
                ]}
                data={filteredDocuments}
                emptyMessage={
                  selectedProjectId
                    ? 'No documents found'
                    : 'Select a project to view documents'
                }
              />
            </Card>
          </div>
        </>
      )}

      {statusModalDocument && (
        <div style={modalOverlayStyle} role="dialog" aria-modal="true">
          <div style={{ ...modalStyle, width: 'min(460px, 100%)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
              <h2 style={{ margin: 0 }}>Change Document Status</h2>

              <Button
                type="button"
                variant="secondary"
                onClick={() => setStatusModalDocument(null)}
                disabled={actionLoading}
              >
                <X size={15} /> Close
              </Button>
            </div>

            <p style={{ color: '#64748b', marginTop: 12 }}>
              Select the next controlled-document status for{' '}
              <strong>{statusModalDocument.code}</strong>.
            </p>

            <SelectField
              label="Status"
              value={statusModalValue}
              disabled={actionLoading}
              onChange={(value) => setStatusModalValue(value as DocumentStatus)}
            >
              {documentStatuses.map((status) => (
                <option key={status} value={status}>
                  {status.replace(/_/g, ' ')}
                </option>
              ))}
            </SelectField>

            {statusModalValue === 'REJECTED' && (
              <TextAreaField
                label="Rejection Reason"
                value={statusRejectionReason}
                disabled={actionLoading}
                onChange={setStatusRejectionReason}
              />
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setStatusModalDocument(null)}
                disabled={actionLoading}
              >
                Cancel
              </Button>

              <Button
                type="button"
                disabled={actionLoading}
                onClick={handleConfirmStatusChange}
              >
                {actionLoading ? 'Updating...' : 'Update Status'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {selectedDocument && (
        <DocumentDetailsModal
          document={selectedDocument}
          onClose={() => setSelectedDocument(null)}
          onDownload={handleDownload}
          actionLoading={actionLoading}
        />
      )}
    </div>
  );
}

function DocumentsLoading() {
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
              animation: 'documents-spin 0.8s linear infinite',
            }}
          />

          <div>
            <strong style={{ color: '#111827' }}>Loading documents</strong>

            <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: 14 }}>
              Retrieving project documents, revisions, upload records, and
              controlled status information from the server. Please wait.
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
                  minHeight: cardIndex === 0 ? 560 : 280,
                  padding: 18,
                  marginBottom: 16,
                  borderRadius: 14,
                  background: '#ffffff',
                  border: '1px solid #e5e7eb',
                }}
              >
                <Skeleton width="170px" height={18} />

                {Array.from({ length: cardIndex === 0 ? 10 : 5 }).map(
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
            <Skeleton width="100%" height={38} marginTop={20} />

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
            @keyframes documents-spin {
              to {
                transform: rotate(360deg);
              }
            }

            @keyframes documents-pulse {
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
        animation: 'documents-pulse 1.4s ease-in-out infinite',
      }}
    />
  );
}

function DocumentDetailsModal({
  document,
  onClose,
  onDownload,
  actionLoading,
}: {
  document: ProjectDocument;
  onClose: () => void;
  onDownload: (versionId: number, fileName?: string) => void;
  actionLoading: boolean;
}) {
  return (
    <div style={modalOverlayStyle} role="dialog" aria-modal="true">
      <div style={modalStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
          <h2 style={{ margin: 0 }}>
            {document.code} - {document.title}
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
          <Detail label="Type" value={document.type} />
          <Detail label="Status" value={document.status} />
          <Detail label="Revision" value={document.currentRevision || '-'} />
          <Detail
            label="Project"
            value={
              document.project
                ? `${document.project.code} - ${document.project.name}`
                : '-'
            }
          />
          <Detail label="Discipline" value={document.discipline || '-'} />
          <Detail label="Originator" value={document.originator || '-'} />
          <Detail label="Zone" value={document.zone || '-'} />
          <Detail label="Level" value={document.level || '-'} />
          <Detail label="Description" value={document.description || '-'} wide />
        </div>

        <h3 style={{ marginTop: 24 }}>Versions</h3>

        <div style={{ display: 'grid', gap: 8 }}>
          {document.versions?.length ? (
            document.versions.map((version) => (
              <div key={version.id} style={versionRowStyle}>
                <div>
                  <strong>{version.revision}</strong>
                  <div style={{ color: '#64748b', fontSize: 13 }}>
                    {version.fileName}
                  </div>
                </div>

                <div>{version.status}</div>

                <IconOnlyButton
                  title="Download"
                  disabled={actionLoading}
                  onClick={() => onDownload(version.id, version.fileName)}
                  color="#2563eb"
                >
                  <Download size={15} />
                </IconOnlyButton>
              </div>
            ))
          ) : (
            <p>No versions uploaded</p>
          )}
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
    <span style={badgeStyle(status || 'WIP')}>
      {String(status || 'WIP').replace(/_/g, ' ')}
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

function TextAreaField({
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
        rows={3}
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

function getFileNameFromDisposition(disposition: string | null) {
  if (!disposition) return '';

  const match = disposition.match(/filename="?([^";]+)"?/i);

  return match?.[1] || '';
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
  width: 'min(920px, 100%)',
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

const versionRowStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 120px 40px',
  alignItems: 'center',
  gap: 12,
  padding: 10,
  border: '1px solid #e5e7eb',
  borderRadius: 10,
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
    case 'PUBLISHED':
      return { ...base, background: '#dcfce7', color: '#166534' };
    case 'SHARED':
      return { ...base, background: '#dbeafe', color: '#1d4ed8' };
    case 'ARCHIVED':
      return { ...base, background: '#e5e7eb', color: '#374151' };
    case 'REJECTED':
      return { ...base, background: '#fee2e2', color: '#991b1b' };
    default:
      return { ...base, background: '#fef9c3', color: '#854d0e' };
  }
}