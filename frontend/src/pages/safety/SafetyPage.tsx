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
import { safetyApi } from '../../api/safety.api';
import type {
  CreateIncidentPayload,
  CreateRiskAssessmentPayload,
  CreateSafetyInspectionPayload,
  CreateToolboxTalkPayload,
  IncidentSeverity,
  IncidentStatus,
  RiskAssessment,
  SafetyIncident,
  SafetyInspection,
  ToolboxTalk,
} from '../../api/safety.api';
import { Button, Card, DataTable, Input, PageHeader } from '../../components/ui';

const severities: IncidentSeverity[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const incidentStatuses: IncidentStatus[] = ['OPEN', 'INVESTIGATING', 'CLOSED'];
const riskLevels = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

type ActiveForm = 'incident' | 'risk' | 'talk' | 'inspection';
type ViewRecord =
  | { type: 'incident'; data: SafetyIncident }
  | { type: 'risk'; data: RiskAssessment }
  | { type: 'talk'; data: ToolboxTalk }
  | { type: 'inspection'; data: SafetyInspection }
  | null;

const emptyIncidentForm = {
  projectId: 0,
  code: '',
  title: '',
  description: '',
  severity: 'LOW',
  status: 'OPEN',
  incidentDate: '',
  location: '',
  correctiveAction: '',
};

const emptyRiskForm = {
  projectId: 0,
  code: '',
  activity: '',
  hazards: '',
  risks: '',
  controls: '',
  riskLevel: 'MEDIUM',
  reviewDate: '',
};

const emptyTalkForm = {
  projectId: 0,
  topic: '',
  talkDate: '',
  attendeesText: '',
  remarks: '',
};

const emptyInspectionForm = {
  projectId: 0,
  code: '',
  inspectionDate: '',
  findings: '',
  actions: '',
};

export default function SafetyPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [incidents, setIncidents] = useState<SafetyIncident[]>([]);
  const [risks, setRisks] = useState<RiskAssessment[]>([]);
  const [talks, setTalks] = useState<ToolboxTalk[]>([]);
  const [inspections, setInspections] = useState<SafetyInspection[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | ''>('');
  const [activeForm, setActiveForm] = useState<ActiveForm>('incident');
  const [viewRecord, setViewRecord] = useState<ViewRecord>(null);
  const [editingIncident, setEditingIncident] = useState<SafetyIncident | null>(null);
  const [editingRisk, setEditingRisk] = useState<RiskAssessment | null>(null);
  const [editingTalk, setEditingTalk] = useState<ToolboxTalk | null>(null);
  const [editingInspection, setEditingInspection] = useState<SafetyInspection | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const [incidentForm, setIncidentForm] = useState(emptyIncidentForm);
  const [riskForm, setRiskForm] = useState(emptyRiskForm);
  const [talkForm, setTalkForm] = useState(emptyTalkForm);
  const [inspectionForm, setInspectionForm] = useState(emptyInspectionForm);

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === Number(selectedProjectId)),
    [projects, selectedProjectId],
  );

  const filteredIncidents = useMemo(() => filterRecords(incidents, search, ['code', 'title', 'description', 'severity', 'status', 'location']), [incidents, search]);
  const filteredRisks = useMemo(() => filterRecords(risks, search, ['code', 'activity', 'hazards', 'risks', 'controls', 'riskLevel']), [risks, search]);
  const filteredTalks = useMemo(() => filterRecords(talks, search, ['topic', 'remarks']), [talks, search]);
  const filteredInspections = useMemo(() => filterRecords(inspections, search, ['code', 'findings', 'actions']), [inspections, search]);

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

  async function loadSafety(projectId: number) {
    if (!projectId) return;

    try {
      setLoading(true);
      setMessage('');
      const [incidentData, riskData, talkData, inspectionData] = await Promise.all([
        safetyApi.findIncidents(projectId),
        safetyApi.findRiskAssessments(projectId),
        safetyApi.findToolboxTalks(projectId),
        safetyApi.findSafetyInspections(projectId),
      ]);

      setIncidents(incidentData);
      setRisks(riskData);
      setTalks(talkData);
      setInspections(inspectionData);
    } catch (error: any) {
      setMessage(getErrorMessage(error, 'Failed to load safety data'));
    } finally {
      setLoading(false);
    }
  }

  async function handleProjectChange(value: string) {
    const projectId = Number(value);
    setSelectedProjectId(projectId || '');
    resetForms(projectId);
    if (projectId) await loadSafety(projectId);
  }

  function resetForms(projectId = Number(selectedProjectId || 0)) {
    setEditingIncident(null);
    setEditingRisk(null);
    setEditingTalk(null);
    setEditingInspection(null);
    setIncidentForm({ ...emptyIncidentForm, projectId });
    setRiskForm({ ...emptyRiskForm, projectId });
    setTalkForm({ ...emptyTalkForm, projectId });
    setInspectionForm({ ...emptyInspectionForm, projectId });
  }

  async function saveIncident(e: React.FormEvent) {
    e.preventDefault();
    if (!incidentForm.projectId) return setMessage('Project is required');
    if (!incidentForm.code.trim()) return setMessage('Incident code is required');
    if (!incidentForm.title.trim()) return setMessage('Incident title is required');
    if (!incidentForm.description.trim()) return setMessage('Incident description is required');
    if (!incidentForm.incidentDate) return setMessage('Incident date is required');

    try {
      setLoading(true);
      setMessage('');
      const payload: CreateIncidentPayload = {
        projectId: Number(incidentForm.projectId),
        code: incidentForm.code.trim().toUpperCase(),
        title: incidentForm.title.trim(),
        description: incidentForm.description.trim(),
        severity: incidentForm.severity,
        status: incidentForm.status,
        incidentDate: incidentForm.incidentDate,
        location: incidentForm.location.trim(),
        correctiveAction: incidentForm.correctiveAction.trim(),
      };

      if (editingIncident) {
        await safetyApi.updateIncident(editingIncident.id, payload);
        setMessage('Incident updated successfully');
      } else {
        await safetyApi.createIncident(payload);
        setMessage('Incident created successfully');
      }

      resetForms(Number(incidentForm.projectId));
      await loadSafety(Number(incidentForm.projectId));
    } catch (error: any) {
      setMessage(getErrorMessage(error, editingIncident ? 'Failed to update incident' : 'Failed to create incident'));
    } finally {
      setLoading(false);
    }
  }

  async function saveRisk(e: React.FormEvent) {
    e.preventDefault();
    if (!riskForm.projectId) return setMessage('Project is required');
    if (!riskForm.code.trim()) return setMessage('Risk assessment code is required');
    if (!riskForm.activity.trim()) return setMessage('Activity is required');
    if (!riskForm.hazards.trim()) return setMessage('Hazards are required');
    if (!riskForm.risks.trim()) return setMessage('Risks are required');

    try {
      setLoading(true);
      setMessage('');
      const payload: CreateRiskAssessmentPayload = {
        projectId: Number(riskForm.projectId),
        code: riskForm.code.trim().toUpperCase(),
        activity: riskForm.activity.trim(),
        hazards: riskForm.hazards.trim(),
        risks: riskForm.risks.trim(),
        controls: riskForm.controls.trim(),
        riskLevel: riskForm.riskLevel,
        reviewDate: riskForm.reviewDate || undefined,
      };

      if (editingRisk) {
        await safetyApi.updateRiskAssessment(editingRisk.id, payload);
        setMessage('Risk assessment updated successfully');
      } else {
        await safetyApi.createRiskAssessment(payload);
        setMessage('Risk assessment created successfully');
      }

      resetForms(Number(riskForm.projectId));
      await loadSafety(Number(riskForm.projectId));
    } catch (error: any) {
      setMessage(getErrorMessage(error, editingRisk ? 'Failed to update risk assessment' : 'Failed to create risk assessment'));
    } finally {
      setLoading(false);
    }
  }

  async function saveTalk(e: React.FormEvent) {
    e.preventDefault();
    if (!talkForm.projectId) return setMessage('Project is required');
    if (!talkForm.topic.trim()) return setMessage('Topic is required');
    if (!talkForm.talkDate) return setMessage('Talk date is required');

    try {
      setLoading(true);
      setMessage('');
      const payload: CreateToolboxTalkPayload = {
        projectId: Number(talkForm.projectId),
        topic: talkForm.topic.trim(),
        talkDate: talkForm.talkDate,
        attendees: talkForm.attendeesText
          .split('\n')
          .map((name) => name.trim())
          .filter(Boolean)
          .map((name) => ({ name })),
        remarks: talkForm.remarks.trim(),
      };

      if (editingTalk) {
        await safetyApi.updateToolboxTalk(editingTalk.id, payload);
        setMessage('Toolbox talk updated successfully');
      } else {
        await safetyApi.createToolboxTalk(payload);
        setMessage('Toolbox talk created successfully');
      }

      resetForms(Number(talkForm.projectId));
      await loadSafety(Number(talkForm.projectId));
    } catch (error: any) {
      setMessage(getErrorMessage(error, editingTalk ? 'Failed to update toolbox talk' : 'Failed to create toolbox talk'));
    } finally {
      setLoading(false);
    }
  }

  async function saveInspection(e: React.FormEvent) {
    e.preventDefault();
    if (!inspectionForm.projectId) return setMessage('Project is required');
    if (!inspectionForm.code.trim()) return setMessage('Safety inspection code is required');
    if (!inspectionForm.inspectionDate) return setMessage('Inspection date is required');

    try {
      setLoading(true);
      setMessage('');
      const payload: CreateSafetyInspectionPayload = {
        projectId: Number(inspectionForm.projectId),
        code: inspectionForm.code.trim().toUpperCase(),
        inspectionDate: inspectionForm.inspectionDate,
        findings: inspectionForm.findings.trim(),
        actions: inspectionForm.actions.trim(),
      };

      if (editingInspection) {
        await safetyApi.updateSafetyInspection(editingInspection.id, payload);
        setMessage('Safety inspection updated successfully');
      } else {
        await safetyApi.createSafetyInspection(payload);
        setMessage('Safety inspection created successfully');
      }

      resetForms(Number(inspectionForm.projectId));
      await loadSafety(Number(inspectionForm.projectId));
    } catch (error: any) {
      setMessage(getErrorMessage(error, editingInspection ? 'Failed to update safety inspection' : 'Failed to create safety inspection'));
    } finally {
      setLoading(false);
    }
  }

  function editIncident(item: SafetyIncident) {
    setActiveForm('incident');
    setEditingIncident(item);
    setIncidentForm({
      projectId: item.projectId,
      code: item.code,
      title: item.title,
      description: item.description,
      severity: item.severity || 'LOW',
      status: item.status || 'OPEN',
      incidentDate: toDateInputValue(item.incidentDate),
      location: item.location || '',
      correctiveAction: item.correctiveAction || '',
    });
  }

  function editRisk(item: RiskAssessment) {
    setActiveForm('risk');
    setEditingRisk(item);
    setRiskForm({
      projectId: item.projectId,
      code: item.code,
      activity: item.activity,
      hazards: item.hazards,
      risks: item.risks,
      controls: item.controls || '',
      riskLevel: item.riskLevel || 'MEDIUM',
      reviewDate: toDateInputValue(item.reviewDate),
    });
  }

  function editTalk(item: ToolboxTalk) {
    setActiveForm('talk');
    setEditingTalk(item);
    setTalkForm({
      projectId: item.projectId,
      topic: item.topic,
      talkDate: toDateInputValue(item.talkDate),
      attendeesText: item.attendees?.map((entry: any) => entry.name || entry).join('\n') || '',
      remarks: item.remarks || '',
    });
  }

  function editInspection(item: SafetyInspection) {
    setActiveForm('inspection');
    setEditingInspection(item);
    setInspectionForm({
      projectId: item.projectId,
      code: item.code,
      inspectionDate: toDateInputValue(item.inspectionDate),
      findings: item.findings || '',
      actions: item.actions || '',
    });
  }

  async function runAction(action: () => Promise<any>, successMessage: string, fallbackError: string) {
    try {
      setLoading(true);
      setMessage('');
      await action();
      setMessage(successMessage);
      if (selectedProjectId) await loadSafety(Number(selectedProjectId));
    } catch (error: any) {
      setMessage(getErrorMessage(error, fallbackError));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <PageHeader title="Safety" description="Manage incidents, risk assessments, toolbox talks, inspections, corrective actions, and close-out workflow." />

      {message && <Alert type={isSuccess ? 'success' : 'error'}>{message}</Alert>}

      <SelectField label="Project" value={selectedProjectId} onChange={handleProjectChange}>
        <option value="">Select project</option>
        {projects.map((project) => <option key={project.id} value={project.id}>{project.code} - {project.name}</option>)}
      </SelectField>

      <div style={summaryGridStyle}>
        <MetricCard label="Incidents" value={incidents.length} />
        <MetricCard label="Open Incidents" value={incidents.filter((item) => item.status !== 'CLOSED').length} />
        <MetricCard label="Risk Assessments" value={risks.length} />
        <MetricCard label="Project" value={selectedProject?.code || '-'} />
      </div>

      <div style={actionBarStyle}>
        <IconActionButton title="Refresh" onClick={() => selectedProjectId && loadSafety(Number(selectedProjectId))}>
          <RefreshCcw size={16} /> Refresh
        </IconActionButton>
      </div>

      <div className="module-grid">
        <div className="module-sidebar">
          <Card title="Safety Forms">
            <div style={tabStyle}>
              <button type="button" onClick={() => setActiveForm('incident')} style={tabButtonStyle(activeForm === 'incident')}>Incident</button>
              <button type="button" onClick={() => setActiveForm('risk')} style={tabButtonStyle(activeForm === 'risk')}>Risk</button>
              <button type="button" onClick={() => setActiveForm('talk')} style={tabButtonStyle(activeForm === 'talk')}>Toolbox</button>
              <button type="button" onClick={() => setActiveForm('inspection')} style={tabButtonStyle(activeForm === 'inspection')}>Inspection</button>
            </div>

            {activeForm === 'incident' && (
              <form onSubmit={saveIncident}>
                <Input label="Code" value={incidentForm.code} onChange={(e) => setIncidentForm({ ...incidentForm, code: e.target.value })} required />
                <Input label="Title" value={incidentForm.title} onChange={(e) => setIncidentForm({ ...incidentForm, title: e.target.value })} required />
                <TextareaField label="Description" value={incidentForm.description} onChange={(value) => setIncidentForm({ ...incidentForm, description: value })} />
                <SelectField label="Severity" value={incidentForm.severity} onChange={(value) => setIncidentForm({ ...incidentForm, severity: value })}>
                  {severities.map((severity) => <option key={severity} value={severity}>{severity}</option>)}
                </SelectField>
                <SelectField label="Status" value={incidentForm.status} onChange={(value) => setIncidentForm({ ...incidentForm, status: value })}>
                  {incidentStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                </SelectField>
                <Input label="Incident Date" type="date" value={incidentForm.incidentDate} onChange={(e) => setIncidentForm({ ...incidentForm, incidentDate: e.target.value })} required />
                <Input label="Location" value={incidentForm.location} onChange={(e) => setIncidentForm({ ...incidentForm, location: e.target.value })} />
                <TextareaField label="Corrective Action" value={incidentForm.correctiveAction} onChange={(value) => setIncidentForm({ ...incidentForm, correctiveAction: value })} />
                <FormButtons loading={loading} editing={Boolean(editingIncident)} onCancel={() => resetForms()} label="Incident" />
              </form>
            )}

            {activeForm === 'risk' && (
              <form onSubmit={saveRisk}>
                <Input label="Code" value={riskForm.code} onChange={(e) => setRiskForm({ ...riskForm, code: e.target.value })} required />
                <Input label="Activity" value={riskForm.activity} onChange={(e) => setRiskForm({ ...riskForm, activity: e.target.value })} required />
                <TextareaField label="Hazards" value={riskForm.hazards} onChange={(value) => setRiskForm({ ...riskForm, hazards: value })} />
                <TextareaField label="Risks" value={riskForm.risks} onChange={(value) => setRiskForm({ ...riskForm, risks: value })} />
                <TextareaField label="Controls" value={riskForm.controls} onChange={(value) => setRiskForm({ ...riskForm, controls: value })} />
                <SelectField label="Risk Level" value={riskForm.riskLevel} onChange={(value) => setRiskForm({ ...riskForm, riskLevel: value })}>
                  {riskLevels.map((level) => <option key={level} value={level}>{level}</option>)}
                </SelectField>
                <Input label="Review Date" type="date" value={riskForm.reviewDate} onChange={(e) => setRiskForm({ ...riskForm, reviewDate: e.target.value })} />
                <FormButtons loading={loading} editing={Boolean(editingRisk)} onCancel={() => resetForms()} label="Risk Assessment" />
              </form>
            )}

            {activeForm === 'talk' && (
              <form onSubmit={saveTalk}>
                <Input label="Topic" value={talkForm.topic} onChange={(e) => setTalkForm({ ...talkForm, topic: e.target.value })} required />
                <Input label="Talk Date" type="date" value={talkForm.talkDate} onChange={(e) => setTalkForm({ ...talkForm, talkDate: e.target.value })} required />
                <TextareaField label="Attendees - one name per line" value={talkForm.attendeesText} onChange={(value) => setTalkForm({ ...talkForm, attendeesText: value })} />
                <TextareaField label="Remarks" value={talkForm.remarks} onChange={(value) => setTalkForm({ ...talkForm, remarks: value })} />
                <FormButtons loading={loading} editing={Boolean(editingTalk)} onCancel={() => resetForms()} label="Toolbox Talk" />
              </form>
            )}

            {activeForm === 'inspection' && (
              <form onSubmit={saveInspection}>
                <Input label="Code" value={inspectionForm.code} onChange={(e) => setInspectionForm({ ...inspectionForm, code: e.target.value })} required />
                <Input label="Inspection Date" type="date" value={inspectionForm.inspectionDate} onChange={(e) => setInspectionForm({ ...inspectionForm, inspectionDate: e.target.value })} required />
                <TextareaField label="Findings" value={inspectionForm.findings} onChange={(value) => setInspectionForm({ ...inspectionForm, findings: value })} />
                <TextareaField label="Actions" value={inspectionForm.actions} onChange={(value) => setInspectionForm({ ...inspectionForm, actions: value })} />
                <FormButtons loading={loading} editing={Boolean(editingInspection)} onCancel={() => resetForms()} label="Safety Inspection" />
              </form>
            )}
          </Card>
        </div>

        <div style={{ display: 'grid', gap: 20 }}>
          <Card title="Safety Register">
            <Input label="Search" placeholder="Search safety records..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </Card>

          <Card title="Incidents">
            <DataTable<SafetyIncident>
              columns={[
                { header: 'Code', accessor: 'code' },
                { header: 'Title', accessor: 'title' },
                { header: 'Severity', accessor: (row) => <StatusBadge status={row.severity} /> },
                { header: 'Status', accessor: (row) => <StatusBadge status={row.status} /> },
                { header: 'Date', accessor: (row) => formatDate(row.incidentDate) },
                { header: 'Location', accessor: (row) => row.location || '-' },
                {
                  header: 'Actions',
                  accessor: (row) => (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <IconOnlyButton title="View" onClick={() => setViewRecord({ type: 'incident', data: row })}><Eye size={15} /></IconOnlyButton>
                      {row.status !== 'CLOSED' && <IconOnlyButton title="Edit" onClick={() => editIncident(row)}><Edit size={15} /></IconOnlyButton>}
                      {row.status === 'CLOSED' ? (
                        <IconOnlyButton title="Reopen" onClick={() => runAction(() => safetyApi.reopenIncident(row.id), 'Incident reopened successfully', 'Failed to reopen incident')} color="#2563eb"><RotateCcw size={15} /></IconOnlyButton>
                      ) : (
                        <IconOnlyButton title="Close" onClick={() => runAction(() => safetyApi.closeIncident(row.id), 'Incident closed successfully', 'Failed to close incident')} color="#16a34a"><CheckCircle2 size={15} /></IconOnlyButton>
                      )}
                      {row.status !== 'CLOSED' && <IconOnlyButton title="Delete" onClick={() => runAction(() => safetyApi.removeIncident(row.id), 'Incident deleted successfully', 'Failed to delete incident')} color="#dc2626"><Trash2 size={15} /></IconOnlyButton>}
                    </div>
                  ),
                },
              ]}
              data={filteredIncidents}
              emptyMessage="No incidents found"
            />
          </Card>

          <Card title="Risk Assessments">
            <DataTable<RiskAssessment>
              columns={[
                { header: 'Code', accessor: 'code' },
                { header: 'Activity', accessor: 'activity' },
                { header: 'Risk Level', accessor: (row) => <StatusBadge status={row.riskLevel || '-'} /> },
                { header: 'Review Date', accessor: (row) => formatDate(row.reviewDate) },
                {
                  header: 'Actions',
                  accessor: (row) => <ActionButtons onView={() => setViewRecord({ type: 'risk', data: row })} onEdit={() => editRisk(row)} onDelete={() => runAction(() => safetyApi.removeRiskAssessment(row.id), 'Risk assessment deleted successfully', 'Failed to delete risk assessment')} />,
                },
              ]}
              data={filteredRisks}
              emptyMessage="No risk assessments found"
            />
          </Card>

          <Card title="Toolbox Talks">
            <DataTable<ToolboxTalk>
              columns={[
                { header: 'Topic', accessor: 'topic' },
                { header: 'Date', accessor: (row) => formatDate(row.talkDate) },
                { header: 'Attendees', accessor: (row) => row.attendees?.length ?? 0 },
                { header: 'Remarks', accessor: (row) => truncate(row.remarks) },
                {
                  header: 'Actions',
                  accessor: (row) => <ActionButtons onView={() => setViewRecord({ type: 'talk', data: row })} onEdit={() => editTalk(row)} onDelete={() => runAction(() => safetyApi.removeToolboxTalk(row.id), 'Toolbox talk deleted successfully', 'Failed to delete toolbox talk')} />,
                },
              ]}
              data={filteredTalks}
              emptyMessage="No toolbox talks found"
            />
          </Card>

          <Card title="Safety Inspections">
            <DataTable<SafetyInspection>
              columns={[
                { header: 'Code', accessor: 'code' },
                { header: 'Date', accessor: (row) => formatDate(row.inspectionDate) },
                { header: 'Findings', accessor: (row) => truncate(row.findings) },
                { header: 'Actions Required', accessor: (row) => truncate(row.actions) },
                {
                  header: 'Actions',
                  accessor: (row) => <ActionButtons onView={() => setViewRecord({ type: 'inspection', data: row })} onEdit={() => editInspection(row)} onDelete={() => runAction(() => safetyApi.removeSafetyInspection(row.id), 'Safety inspection deleted successfully', 'Failed to delete safety inspection')} />,
                },
              ]}
              data={filteredInspections}
              emptyMessage="No safety inspections found"
            />
          </Card>
        </div>
      </div>

      {viewRecord && <SafetyDetailsModal record={viewRecord} onClose={() => setViewRecord(null)} />}
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

function SafetyDetailsModal({ record, onClose }: { record: Exclude<ViewRecord, null>; onClose: () => void }) {
  const data: any = record.data;
  return (
    <div style={modalOverlayStyle} role="dialog" aria-modal="true">
      <div style={modalStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
          <h2 style={{ margin: 0 }}>{record.type.toUpperCase()}</h2>
          <Button type="button" variant="secondary" onClick={onClose}><X size={15} /> Close</Button>
        </div>
        <div style={detailsGridStyle}>
          <Detail label="Code / Topic" value={data.code || data.topic || '-'} />
          <Detail label="Title / Activity" value={data.title || data.activity || '-'} />
          <Detail label="Status / Risk" value={data.status || data.riskLevel || '-'} />
          <Detail label="Date" value={formatDate(data.incidentDate || data.reviewDate || data.talkDate || data.inspectionDate)} />
          <Detail label="Description / Hazards" value={data.description || data.hazards || data.findings || '-'} wide />
          <Detail label="Risks / Actions" value={data.risks || data.actions || data.correctiveAction || '-'} wide />
          <Detail label="Controls / Remarks" value={data.controls || data.remarks || '-'} wide />
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
  return <span style={badgeStyle(status || '-')}>{status || '-'}</span>;
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

function filterRecords<T extends Record<string, any>>(records: T[], keyword: string, fields: string[]) {
  const query = keyword.trim().toLowerCase();
  if (!query) return records;
  return records.filter((record) => fields.some((field) => String(record[field] || '').toLowerCase().includes(query)));
}

function getErrorMessage(error: any, fallback: string) {
  return error?.response?.data?.message || error?.message || fallback;
}

const summaryGridStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 16 };
const metricCardStyle: React.CSSProperties = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, boxShadow: '0 1px 2px rgba(15, 23, 42, 0.06)' };
const actionBarStyle: React.CSSProperties = { display: 'flex', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 8, marginBottom: 16 };
const tabStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 16 };
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
    case 'CRITICAL':
    case 'HIGH': return { ...base, background: '#fee2e2', color: '#991b1b' };
    case 'MEDIUM':
    case 'INVESTIGATING': return { ...base, background: '#fef9c3', color: '#854d0e' };
    case 'LOW': return { ...base, background: '#dcfce7', color: '#166534' };
    case 'CLOSED': return { ...base, background: '#e5e7eb', color: '#374151' };
    default: return { ...base, background: '#dbeafe', color: '#1d4ed8' };
  }
}
