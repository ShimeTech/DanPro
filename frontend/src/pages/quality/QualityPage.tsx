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
} from 'lucide-react';

import { projectsApi } from '../../api/projects.api';
import type { Project } from '../../api/projects.api';
import { qualityApi } from '../../api/quality.api';
import type {
  CreateChecklistPayload,
  CreateInspectionPayload,
  CreateNcrPayload,
  Inspection,
  InspectionStatus,
  NcrReport,
  NcrStatus,
  QualityChecklist,
} from '../../api/quality.api';
import { Button, Card, DataTable, Input, PageHeader } from '../../components/ui';

const inspectionStatuses: InspectionStatus[] = ['PLANNED', 'PASSED', 'FAILED', 'CANCELLED'];
const ncrStatuses: NcrStatus[] = ['OPEN', 'UNDER_REVIEW', 'CLOSED'];

type ActiveForm = 'checklist' | 'inspection' | 'ncr';
type ViewRecord =
  | { type: 'checklist'; data: QualityChecklist }
  | { type: 'inspection'; data: Inspection }
  | { type: 'ncr'; data: NcrReport }
  | null;

const emptyChecklistForm = {
  projectId: 0,
  code: '',
  title: '',
  description: '',
  itemsText: '',
};

const emptyInspectionForm = {
  projectId: 0,
  checklistId: '',
  code: '',
  title: '',
  location: '',
  inspectionDate: '',
  status: 'PLANNED',
  result: '',
};

const emptyNcrForm = {
  projectId: 0,
  code: '',
  title: '',
  description: '',
  status: 'OPEN',
  correctiveAction: '',
  dueDate: '',
};

export default function QualityPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [checklists, setChecklists] = useState<QualityChecklist[]>([]);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [ncrs, setNcrs] = useState<NcrReport[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | ''>('');
  const [activeForm, setActiveForm] = useState<ActiveForm>('checklist');
  const [viewRecord, setViewRecord] = useState<ViewRecord>(null);
  const [editingChecklist, setEditingChecklist] = useState<QualityChecklist | null>(null);
  const [editingInspection, setEditingInspection] = useState<Inspection | null>(null);
  const [editingNcr, setEditingNcr] = useState<NcrReport | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const [checklistForm, setChecklistForm] = useState(emptyChecklistForm);
  const [inspectionForm, setInspectionForm] = useState(emptyInspectionForm);
  const [ncrForm, setNcrForm] = useState(emptyNcrForm);

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === Number(selectedProjectId)),
    [projects, selectedProjectId],
  );

  const filteredChecklists = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return checklists;
    return checklists.filter((item) => [item.code, item.title, item.description].some((value) => String(value || '').toLowerCase().includes(keyword)));
  }, [checklists, search]);

  const filteredInspections = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return inspections;
    return inspections.filter((item) => [item.code, item.title, item.location, item.status, item.result].some((value) => String(value || '').toLowerCase().includes(keyword)));
  }, [inspections, search]);

  const filteredNcrs = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return ncrs;
    return ncrs.filter((item) => [item.code, item.title, item.description, item.status, item.correctiveAction].some((value) => String(value || '').toLowerCase().includes(keyword)));
  }, [ncrs, search]);

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

  async function loadQuality(projectId: number) {
    if (!projectId) return;

    try {
      setLoading(true);
      setMessage('');
      const [checklistData, inspectionData, ncrData] = await Promise.all([
        qualityApi.findChecklists(projectId),
        qualityApi.findInspections(projectId),
        qualityApi.findNcrs(projectId),
      ]);

      setChecklists(checklistData);
      setInspections(inspectionData);
      setNcrs(ncrData);
    } catch (error: any) {
      setMessage(getErrorMessage(error, 'Failed to load quality data'));
    } finally {
      setLoading(false);
    }
  }

  async function handleProjectChange(value: string) {
    const projectId = Number(value);
    setSelectedProjectId(projectId || '');
    resetForms(projectId);
    if (projectId) await loadQuality(projectId);
  }

  function resetForms(projectId = Number(selectedProjectId || 0)) {
    setEditingChecklist(null);
    setEditingInspection(null);
    setEditingNcr(null);
    setChecklistForm({ ...emptyChecklistForm, projectId });
    setInspectionForm({ ...emptyInspectionForm, projectId });
    setNcrForm({ ...emptyNcrForm, projectId });
  }

  async function saveChecklist(e: React.FormEvent) {
    e.preventDefault();
    if (!checklistForm.projectId) return setMessage('Project is required');
    if (!checklistForm.code.trim()) return setMessage('Checklist code is required');
    if (!checklistForm.title.trim()) return setMessage('Checklist title is required');

    try {
      setLoading(true);
      setMessage('');
      const payload: CreateChecklistPayload = {
        projectId: Number(checklistForm.projectId),
        code: checklistForm.code.trim().toUpperCase(),
        title: checklistForm.title.trim(),
        description: checklistForm.description.trim(),
        items: checklistForm.itemsText
          .split('\n')
          .map((item) => item.trim())
          .filter(Boolean)
          .map((item) => ({ item, required: true })),
      };

      if (editingChecklist) {
        await qualityApi.updateChecklist(editingChecklist.id, payload);
        setMessage('Checklist updated successfully');
      } else {
        await qualityApi.createChecklist(payload);
        setMessage('Checklist created successfully');
      }

      resetForms(Number(checklistForm.projectId));
      await loadQuality(Number(checklistForm.projectId));
    } catch (error: any) {
      setMessage(getErrorMessage(error, editingChecklist ? 'Failed to update checklist' : 'Failed to create checklist'));
    } finally {
      setLoading(false);
    }
  }

  async function saveInspection(e: React.FormEvent) {
    e.preventDefault();
    if (!inspectionForm.projectId) return setMessage('Project is required');
    if (!inspectionForm.code.trim()) return setMessage('Inspection code is required');
    if (!inspectionForm.title.trim()) return setMessage('Inspection title is required');

    try {
      setLoading(true);
      setMessage('');
      const payload: CreateInspectionPayload = {
        projectId: Number(inspectionForm.projectId),
        checklistId: inspectionForm.checklistId ? Number(inspectionForm.checklistId) : undefined,
        code: inspectionForm.code.trim().toUpperCase(),
        title: inspectionForm.title.trim(),
        location: inspectionForm.location.trim(),
        inspectionDate: inspectionForm.inspectionDate || undefined,
        status: inspectionForm.status,
        result: inspectionForm.result.trim(),
      };

      if (editingInspection) {
        await qualityApi.updateInspection(editingInspection.id, payload);
        setMessage('Inspection updated successfully');
      } else {
        await qualityApi.createInspection(payload);
        setMessage('Inspection created successfully');
      }

      resetForms(Number(inspectionForm.projectId));
      await loadQuality(Number(inspectionForm.projectId));
    } catch (error: any) {
      setMessage(getErrorMessage(error, editingInspection ? 'Failed to update inspection' : 'Failed to create inspection'));
    } finally {
      setLoading(false);
    }
  }

  async function saveNcr(e: React.FormEvent) {
    e.preventDefault();
    if (!ncrForm.projectId) return setMessage('Project is required');
    if (!ncrForm.code.trim()) return setMessage('NCR code is required');
    if (!ncrForm.title.trim()) return setMessage('NCR title is required');
    if (!ncrForm.description.trim()) return setMessage('NCR description is required');

    try {
      setLoading(true);
      setMessage('');
      const payload: CreateNcrPayload = {
        projectId: Number(ncrForm.projectId),
        code: ncrForm.code.trim().toUpperCase(),
        title: ncrForm.title.trim(),
        description: ncrForm.description.trim(),
        status: ncrForm.status,
        correctiveAction: ncrForm.correctiveAction.trim(),
        dueDate: ncrForm.dueDate || undefined,
      };

      if (editingNcr) {
        await qualityApi.updateNcr(editingNcr.id, payload);
        setMessage('NCR updated successfully');
      } else {
        await qualityApi.createNcr(payload);
        setMessage('NCR created successfully');
      }

      resetForms(Number(ncrForm.projectId));
      await loadQuality(Number(ncrForm.projectId));
    } catch (error: any) {
      setMessage(getErrorMessage(error, editingNcr ? 'Failed to update NCR' : 'Failed to create NCR'));
    } finally {
      setLoading(false);
    }
  }

  function editChecklist(item: QualityChecklist) {
    setActiveForm('checklist');
    setEditingChecklist(item);
    setChecklistForm({
      projectId: item.projectId,
      code: item.code,
      title: item.title,
      description: item.description || '',
      itemsText: item.items?.map((entry: any) => entry.item || entry).join('\n') || '',
    });
  }

  function editInspection(item: Inspection) {
    setActiveForm('inspection');
    setEditingInspection(item);
    setInspectionForm({
      projectId: item.projectId,
      checklistId: item.checklistId ? String(item.checklistId) : '',
      code: item.code,
      title: item.title,
      location: item.location || '',
      inspectionDate: toDateInputValue(item.inspectionDate),
      status: item.status || 'PLANNED',
      result: item.result || '',
    });
  }

  function editNcr(item: NcrReport) {
    setActiveForm('ncr');
    setEditingNcr(item);
    setNcrForm({
      projectId: item.projectId,
      code: item.code,
      title: item.title,
      description: item.description || '',
      status: item.status || 'OPEN',
      correctiveAction: item.correctiveAction || '',
      dueDate: toDateInputValue(item.dueDate),
    });
  }

  async function runAction(action: () => Promise<any>, successMessage: string, fallbackError: string) {
    try {
      setLoading(true);
      setMessage('');
      await action();
      setMessage(successMessage);
      if (selectedProjectId) await loadQuality(Number(selectedProjectId));
    } catch (error: any) {
      setMessage(getErrorMessage(error, fallbackError));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <PageHeader title="Quality" description="Manage checklists, inspections, NCRs, corrective actions, and quality close-out workflow." />

      {message && <Alert type={isSuccess ? 'success' : 'error'}>{message}</Alert>}

      <SelectField label="Project" value={selectedProjectId} onChange={handleProjectChange}>
        <option value="">Select project</option>
        {projects.map((project) => <option key={project.id} value={project.id}>{project.code} - {project.name}</option>)}
      </SelectField>

      <div style={summaryGridStyle}>
        <MetricCard label="Checklists" value={checklists.length} />
        <MetricCard label="Inspections" value={inspections.length} />
        <MetricCard label="Open NCRs" value={ncrs.filter((item) => item.status !== 'CLOSED').length} />
        <MetricCard label="Project" value={selectedProject?.code || '-'} />
      </div>

      <div style={actionBarStyle}>
        <IconActionButton title="Refresh" onClick={() => selectedProjectId && loadQuality(Number(selectedProjectId))}>
          <RefreshCcw size={16} /> Refresh
        </IconActionButton>
      </div>

      <div className="module-grid">
        <div className="module-sidebar">
          <Card title="Quality Forms">
            <div style={tabStyle}>
              <button type="button" onClick={() => setActiveForm('checklist')} style={tabButtonStyle(activeForm === 'checklist')}>Checklist</button>
              <button type="button" onClick={() => setActiveForm('inspection')} style={tabButtonStyle(activeForm === 'inspection')}>Inspection</button>
              <button type="button" onClick={() => setActiveForm('ncr')} style={tabButtonStyle(activeForm === 'ncr')}>NCR</button>
            </div>

            {activeForm === 'checklist' && (
              <form onSubmit={saveChecklist}>
                <Input label="Code" value={checklistForm.code} onChange={(e) => setChecklistForm({ ...checklistForm, code: e.target.value })} required />
                <Input label="Title" value={checklistForm.title} onChange={(e) => setChecklistForm({ ...checklistForm, title: e.target.value })} required />
                <TextareaField label="Description" value={checklistForm.description} onChange={(value) => setChecklistForm({ ...checklistForm, description: value })} />
                <TextareaField label="Checklist Items - one item per line" value={checklistForm.itemsText} onChange={(value) => setChecklistForm({ ...checklistForm, itemsText: value })} />
                <FormButtons loading={loading} editing={Boolean(editingChecklist)} onCancel={() => resetForms()} label="Checklist" />
              </form>
            )}

            {activeForm === 'inspection' && (
              <form onSubmit={saveInspection}>
                <SelectField label="Checklist" value={inspectionForm.checklistId} onChange={(value) => setInspectionForm({ ...inspectionForm, checklistId: value })}>
                  <option value="">No checklist</option>
                  {checklists.map((item) => <option key={item.id} value={item.id}>{item.code} - {item.title}</option>)}
                </SelectField>
                <Input label="Code" value={inspectionForm.code} onChange={(e) => setInspectionForm({ ...inspectionForm, code: e.target.value })} required />
                <Input label="Title" value={inspectionForm.title} onChange={(e) => setInspectionForm({ ...inspectionForm, title: e.target.value })} required />
                <Input label="Location" value={inspectionForm.location} onChange={(e) => setInspectionForm({ ...inspectionForm, location: e.target.value })} />
                <Input label="Inspection Date" type="date" value={inspectionForm.inspectionDate} onChange={(e) => setInspectionForm({ ...inspectionForm, inspectionDate: e.target.value })} />
                <SelectField label="Status" value={inspectionForm.status} onChange={(value) => setInspectionForm({ ...inspectionForm, status: value })}>
                  {inspectionStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                </SelectField>
                <TextareaField label="Result" value={inspectionForm.result} onChange={(value) => setInspectionForm({ ...inspectionForm, result: value })} />
                <FormButtons loading={loading} editing={Boolean(editingInspection)} onCancel={() => resetForms()} label="Inspection" />
              </form>
            )}

            {activeForm === 'ncr' && (
              <form onSubmit={saveNcr}>
                <Input label="Code" value={ncrForm.code} onChange={(e) => setNcrForm({ ...ncrForm, code: e.target.value })} required />
                <Input label="Title" value={ncrForm.title} onChange={(e) => setNcrForm({ ...ncrForm, title: e.target.value })} required />
                <TextareaField label="Description" value={ncrForm.description} onChange={(value) => setNcrForm({ ...ncrForm, description: value })} />
                <SelectField label="Status" value={ncrForm.status} onChange={(value) => setNcrForm({ ...ncrForm, status: value })}>
                  {ncrStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                </SelectField>
                <TextareaField label="Corrective Action" value={ncrForm.correctiveAction} onChange={(value) => setNcrForm({ ...ncrForm, correctiveAction: value })} />
                <Input label="Due Date" type="date" value={ncrForm.dueDate} onChange={(e) => setNcrForm({ ...ncrForm, dueDate: e.target.value })} />
                <FormButtons loading={loading} editing={Boolean(editingNcr)} onCancel={() => resetForms()} label="NCR" />
              </form>
            )}
          </Card>
        </div>

        <div style={{ display: 'grid', gap: 20 }}>
          <Card title="Quality Register">
            <Input label="Search" placeholder="Search quality records..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </Card>

          <Card title="Checklists">
            <DataTable<QualityChecklist>
              columns={[
                { header: 'Code', accessor: 'code' },
                { header: 'Title', accessor: 'title' },
                { header: 'Items', accessor: (row) => row.items?.length ?? 0 },
                {
                  header: 'Actions',
                  accessor: (row) => (
                    <ActionButtons
                      onView={() => setViewRecord({ type: 'checklist', data: row })}
                      onEdit={() => editChecklist(row)}
                      onDelete={() => runAction(() => qualityApi.removeChecklist(row.id), 'Checklist deleted successfully', 'Failed to delete checklist')}
                    />
                  ),
                },
              ]}
              data={filteredChecklists}
              emptyMessage="No checklists found"
            />
          </Card>

          <Card title="Inspections">
            <DataTable<Inspection>
              columns={[
                { header: 'Code', accessor: 'code' },
                { header: 'Title', accessor: 'title' },
                { header: 'Location', accessor: (row) => row.location || '-' },
                { header: 'Status', accessor: (row) => <StatusBadge status={row.status} /> },
                { header: 'Date', accessor: (row) => formatDate(row.inspectionDate) },
                {
                  header: 'Actions',
                  accessor: (row) => (
                    <ActionButtons
                      onView={() => setViewRecord({ type: 'inspection', data: row })}
                      onEdit={() => editInspection(row)}
                      onDelete={() => runAction(() => qualityApi.removeInspection(row.id), 'Inspection deleted successfully', 'Failed to delete inspection')}
                    />
                  ),
                },
              ]}
              data={filteredInspections}
              emptyMessage="No inspections found"
            />
          </Card>

          <Card title="NCRs">
            <DataTable<NcrReport>
              columns={[
                { header: 'Code', accessor: 'code' },
                { header: 'Title', accessor: 'title' },
                { header: 'Status', accessor: (row) => <StatusBadge status={row.status} /> },
                { header: 'Due Date', accessor: (row) => formatDate(row.dueDate) },
                { header: 'Corrective Action', accessor: (row) => truncate(row.correctiveAction) },
                {
                  header: 'Actions',
                  accessor: (row) => (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <IconOnlyButton title="View" onClick={() => setViewRecord({ type: 'ncr', data: row })}><Eye size={15} /></IconOnlyButton>
                      {row.status !== 'CLOSED' && <IconOnlyButton title="Edit" onClick={() => editNcr(row)}><Edit size={15} /></IconOnlyButton>}
                      {row.status === 'CLOSED' ? (
                        <IconOnlyButton title="Reopen" onClick={() => runAction(() => qualityApi.reopenNcr(row.id), 'NCR reopened successfully', 'Failed to reopen NCR')} color="#2563eb"><RotateCcw size={15} /></IconOnlyButton>
                      ) : (
                        <IconOnlyButton title="Close" onClick={() => runAction(() => qualityApi.closeNcr(row.id), 'NCR closed successfully', 'Failed to close NCR')} color="#16a34a"><CheckCircle2 size={15} /></IconOnlyButton>
                      )}
                      {row.status !== 'CLOSED' && <IconOnlyButton title="Delete" onClick={() => runAction(() => qualityApi.removeNcr(row.id), 'NCR deleted successfully', 'Failed to delete NCR')} color="#dc2626"><Trash2 size={15} /></IconOnlyButton>}
                    </div>
                  ),
                },
              ]}
              data={filteredNcrs}
              emptyMessage="No NCRs found"
            />
          </Card>
        </div>
      </div>

      {viewRecord && <QualityDetailsModal record={viewRecord} onClose={() => setViewRecord(null)} />}
    </div>
  );
}

function FormButtons({ loading, editing, onCancel, label }: { loading: boolean; editing: boolean; onCancel: () => void; label: string }) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <Button disabled={loading} style={{ flex: 1 }}>
        {loading ? 'Saving...' : editing ? <><Save size={15} /> Save Changes</> : `Create ${label}`}
      </Button>
      {editing && <Button type="button" variant="secondary" onClick={onCancel}><X size={15} /> Cancel</Button>}
    </div>
  );
}

function ActionButtons({ onView, onEdit, onDelete }: { onView: () => void; onEdit: () => void; onDelete: () => void }) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      <IconOnlyButton title="View" onClick={onView}><Eye size={15} /></IconOnlyButton>
      <IconOnlyButton title="Edit" onClick={onEdit}><Edit size={15} /></IconOnlyButton>
      <IconOnlyButton title="Delete" onClick={onDelete} color="#dc2626"><Trash2 size={15} /></IconOnlyButton>
    </div>
  );
}

function QualityDetailsModal({ record, onClose }: { record: Exclude<ViewRecord, null>; onClose: () => void }) {
  const data: any = record.data;
  return (
    <div style={modalOverlayStyle} role="dialog" aria-modal="true">
      <div style={modalStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
          <h2 style={{ margin: 0 }}>{record.type.toUpperCase()} - {data.code}</h2>
          <Button type="button" variant="secondary" onClick={onClose}><X size={15} /> Close</Button>
        </div>
        <div style={detailsGridStyle}>
          <Detail label="Code" value={data.code || '-'} />
          <Detail label="Title" value={data.title || '-'} />
          <Detail label="Status" value={data.status || '-'} />
          <Detail label="Date" value={formatDate(data.inspectionDate || data.dueDate)} />
          <Detail label="Description / Result" value={data.description || data.result || '-'} wide />
          <Detail label="Corrective Action" value={data.correctiveAction || '-'} wide />
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

function IconActionButton({ children, title, onClick }: { children: React.ReactNode; title: string; onClick: () => void }) {
  return <button type="button" title={title} onClick={onClick} style={iconActionButtonStyle}>{children}</button>;
}

function IconOnlyButton({ children, title, onClick, color }: { children: React.ReactNode; title: string; onClick: () => void; color?: string }) {
  return <button type="button" title={title} onClick={onClick} style={{ ...iconOnlyButtonStyle, color: color || '#334155' }}>{children}</button>;
}

function StatusBadge({ status }: { status?: string }) {
  return <span style={badgeStyle(status || 'OPEN')}>{status || 'OPEN'}</span>;
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

const summaryGridStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 16 };
const metricCardStyle: React.CSSProperties = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, boxShadow: '0 1px 2px rgba(15, 23, 42, 0.06)' };
const actionBarStyle: React.CSSProperties = { display: 'flex', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 8, marginBottom: 16 };
const tabStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 16 };
const fieldStyle: React.CSSProperties = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff' };
const iconActionButtonStyle: React.CSSProperties = { minHeight: 38, padding: '8px 12px', borderRadius: 10, border: '1px solid #dbe3ef', background: '#fff', color: '#1e293b', display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontWeight: 700 };
const iconOnlyButtonStyle: React.CSSProperties = { width: 32, height: 32, borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' };
const modalOverlayStyle: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24 };
const modalStyle: React.CSSProperties = { width: 'min(820px, 100%)', maxHeight: '90vh', overflowY: 'auto', background: '#fff', borderRadius: 14, padding: 24, boxShadow: '0 20px 40px rgba(15, 23, 42, 0.25)' };
const detailsGridStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16, marginTop: 20 };

function tabButtonStyle(active: boolean): React.CSSProperties {
  return { padding: '8px 10px', borderRadius: 8, border: '1px solid #dbe3ef', background: active ? '#2563eb' : '#fff', color: active ? '#fff' : '#1e293b', cursor: 'pointer', fontWeight: 700 };
}

function badgeStyle(status: string): React.CSSProperties {
  const base: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', borderRadius: 999, padding: '4px 10px', fontSize: 12, fontWeight: 700 };
  switch (status) {
    case 'PASSED': return { ...base, background: '#dcfce7', color: '#166534' };
    case 'FAILED': return { ...base, background: '#fee2e2', color: '#991b1b' };
    case 'CLOSED': return { ...base, background: '#e5e7eb', color: '#374151' };
    case 'UNDER_REVIEW': return { ...base, background: '#fef9c3', color: '#854d0e' };
    case 'CANCELLED': return { ...base, background: '#f1f5f9', color: '#475569' };
    default: return { ...base, background: '#dbeafe', color: '#1d4ed8' };
  }
}
