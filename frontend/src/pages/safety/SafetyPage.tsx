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

  const [editingIncident, setEditingIncident] =
    useState<SafetyIncident | null>(null);
  const [editingRisk, setEditingRisk] = useState<RiskAssessment | null>(null);
  const [editingTalk, setEditingTalk] = useState<ToolboxTalk | null>(null);
  const [editingInspection, setEditingInspection] =
    useState<SafetyInspection | null>(null);

  const [search, setSearch] = useState('');
  const [pageLoading, setPageLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState('');

  const [incidentForm, setIncidentForm] = useState(emptyIncidentForm);
  const [riskForm, setRiskForm] = useState(emptyRiskForm);
  const [talkForm, setTalkForm] = useState(emptyTalkForm);
  const [inspectionForm, setInspectionForm] = useState(emptyInspectionForm);

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === Number(selectedProjectId)),
    [projects, selectedProjectId],
  );

  const filteredIncidents = useMemo(
    () =>
      filterRecords(incidents, search, [
        'code',
        'title',
        'description',
        'severity',
        'status',
        'location',
      ]),
    [incidents, search],
  );

  const filteredRisks = useMemo(
    () =>
      filterRecords(risks, search, [
        'code',
        'activity',
        'hazards',
        'risks',
        'controls',
        'riskLevel',
      ]),
    [risks, search],
  );

  const filteredTalks = useMemo(
    () => filterRecords(talks, search, ['topic', 'remarks']),
    [talks, search],
  );

  const filteredInspections = useMemo(
    () => filterRecords(inspections, search, ['code', 'findings', 'actions']),
    [inspections, search],
  );

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

        setIncidentForm({
          ...emptyIncidentForm,
          projectId: firstProjectId,
        });

        setRiskForm({
          ...emptyRiskForm,
          projectId: firstProjectId,
        });

        setTalkForm({
          ...emptyTalkForm,
          projectId: firstProjectId,
        });

        setInspectionForm({
          ...emptyInspectionForm,
          projectId: firstProjectId,
        });

        const [incidentData, riskData, talkData, inspectionData] =
          await Promise.all([
            safetyApi.findIncidents(firstProjectId),
            safetyApi.findRiskAssessments(firstProjectId),
            safetyApi.findToolboxTalks(firstProjectId),
            safetyApi.findSafetyInspections(firstProjectId),
          ]);

        setIncidents(incidentData);
        setRisks(riskData);
        setTalks(talkData);
        setInspections(inspectionData);
      } else {
        setSelectedProjectId('');
        setIncidents([]);
        setRisks([]);
        setTalks([]);
        setInspections([]);
      }
    } catch (error: any) {
      setMessage(getErrorMessage(error, 'Failed to load safety data'));
    } finally {
      setPageLoading(false);
    }
  }

  async function loadSafety(projectId: number) {
    if (!projectId) {
      setIncidents([]);
      setRisks([]);
      setTalks([]);
      setInspections([]);
      return;
    }

    const [incidentData, riskData, talkData, inspectionData] =
      await Promise.all([
        safetyApi.findIncidents(projectId),
        safetyApi.findRiskAssessments(projectId),
        safetyApi.findToolboxTalks(projectId),
        safetyApi.findSafetyInspections(projectId),
      ]);

    setIncidents(incidentData);
    setRisks(riskData);
    setTalks(talkData);
    setInspections(inspectionData);
  }

  async function handleProjectChange(value: string) {
    try {
      setActionLoading(true);
      setMessage('');

      const projectId = Number(value);

      setSelectedProjectId(projectId || '');
      resetForms(projectId);

      if (projectId) {
        await loadSafety(projectId);
      } else {
        setIncidents([]);
        setRisks([]);
        setTalks([]);
        setInspections([]);
      }
    } catch (error: any) {
      setMessage(getErrorMessage(error, 'Failed to load safety data'));
    } finally {
      setActionLoading(false);
    }
  }

  function resetForms(projectId = Number(selectedProjectId || 0)) {
    setEditingIncident(null);
    setEditingRisk(null);
    setEditingTalk(null);
    setEditingInspection(null);

    setIncidentForm({
      ...emptyIncidentForm,
      projectId,
    });

    setRiskForm({
      ...emptyRiskForm,
      projectId,
    });

    setTalkForm({
      ...emptyTalkForm,
      projectId,
    });

    setInspectionForm({
      ...emptyInspectionForm,
      projectId,
    });
  }

  async function saveIncident(e: React.FormEvent) {
    e.preventDefault();

    if (!incidentForm.projectId) return setMessage('Project is required');
    if (!incidentForm.code.trim()) return setMessage('Incident code is required');
    if (!incidentForm.title.trim()) return setMessage('Incident title is required');
    if (!incidentForm.description.trim()) {
      return setMessage('Incident description is required');
    }
    if (!incidentForm.incidentDate) return setMessage('Incident date is required');

    try {
      setActionLoading(true);
      setMessage('');

      const payload: CreateIncidentPayload = {
        projectId: Number(incidentForm.projectId),
        code: incidentForm.code.trim().toUpperCase(),
        title: incidentForm.title.trim(),
        description: incidentForm.description.trim(),
        severity: incidentForm.severity as IncidentSeverity,
        status: incidentForm.status as IncidentStatus,
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
      setMessage(
        getErrorMessage(
          error,
          editingIncident
            ? 'Failed to update incident'
            : 'Failed to create incident',
        ),
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function saveRisk(e: React.FormEvent) {
    e.preventDefault();

    if (!riskForm.projectId) return setMessage('Project is required');
    if (!riskForm.code.trim()) {
      return setMessage('Risk assessment code is required');
    }
    if (!riskForm.activity.trim()) return setMessage('Activity is required');
    if (!riskForm.hazards.trim()) return setMessage('Hazards are required');
    if (!riskForm.risks.trim()) return setMessage('Risks are required');

    try {
      setActionLoading(true);
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
      setMessage(
        getErrorMessage(
          error,
          editingRisk
            ? 'Failed to update risk assessment'
            : 'Failed to create risk assessment',
        ),
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function saveTalk(e: React.FormEvent) {
    e.preventDefault();

    if (!talkForm.projectId) return setMessage('Project is required');
    if (!talkForm.topic.trim()) return setMessage('Topic is required');
    if (!talkForm.talkDate) return setMessage('Talk date is required');

    try {
      setActionLoading(true);
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
      setMessage(
        getErrorMessage(
          error,
          editingTalk
            ? 'Failed to update toolbox talk'
            : 'Failed to create toolbox talk',
        ),
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function saveInspection(e: React.FormEvent) {
    e.preventDefault();

    if (!inspectionForm.projectId) return setMessage('Project is required');
    if (!inspectionForm.code.trim()) {
      return setMessage('Safety inspection code is required');
    }
    if (!inspectionForm.inspectionDate) {
      return setMessage('Inspection date is required');
    }

    try {
      setActionLoading(true);
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
      setMessage(
        getErrorMessage(
          error,
          editingInspection
            ? 'Failed to update safety inspection'
            : 'Failed to create safety inspection',
        ),
      );
    } finally {
      setActionLoading(false);
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

    setMessage('');
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

    setMessage('');
  }

  function editTalk(item: ToolboxTalk) {
    setActiveForm('talk');
    setEditingTalk(item);

    setTalkForm({
      projectId: item.projectId,
      topic: item.topic,
      talkDate: toDateInputValue(item.talkDate),
      attendeesText:
        item.attendees?.map((entry: any) => entry.name || entry).join('\n') ||
        '',
      remarks: item.remarks || '',
    });

    setMessage('');
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

    setMessage('');
  }

  async function handleRefresh() {
    if (!selectedProjectId) return;

    try {
      setActionLoading(true);
      setMessage('');

      await loadSafety(Number(selectedProjectId));
      setMessage('Safety records refreshed successfully');
    } catch (error: any) {
      setMessage(getErrorMessage(error, 'Failed to refresh safety data'));
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
        await loadSafety(Number(selectedProjectId));
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
        title="Safety"
        description="Manage incidents, risk assessments, toolbox talks, inspections, corrective actions, and close-out workflow."
      />

      {message && <Alert type={isSuccess ? 'success' : 'error'}>{message}</Alert>}

      {pageLoading ? (
        <SafetyLoading />
      ) : (
        <>
          <SelectField
            label="Project"
            value={selectedProjectId}
            disabled={actionLoading}
            onChange={handleProjectChange}
          >
            <option value="">Select project</option>

            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.code} - {project.name}
              </option>
            ))}
          </SelectField>

          <div style={summaryGridStyle}>
            <MetricCard label="Incidents" value={incidents.length} />
            <MetricCard
              label="Open Incidents"
              value={incidents.filter((item) => item.status !== 'CLOSED').length}
            />
            <MetricCard label="Risk Assessments" value={risks.length} />
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
              <Card title="Safety Forms">
                <div style={tabStyle}>
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => setActiveForm('incident')}
                    style={tabButtonStyle(activeForm === 'incident')}
                  >
                    Incident
                  </button>

                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => setActiveForm('risk')}
                    style={tabButtonStyle(activeForm === 'risk')}
                  >
                    Risk
                  </button>

                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => setActiveForm('talk')}
                    style={tabButtonStyle(activeForm === 'talk')}
                  >
                    Toolbox
                  </button>

                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => setActiveForm('inspection')}
                    style={tabButtonStyle(activeForm === 'inspection')}
                  >
                    Inspection
                  </button>
                </div>

                {activeForm === 'incident' && (
                  <form onSubmit={saveIncident} aria-busy={actionLoading}>
                    <Input
                      label="Code"
                      value={incidentForm.code}
                      onChange={(e) =>
                        setIncidentForm({
                          ...incidentForm,
                          code: e.target.value,
                        })
                      }
                      required
                    />

                    <Input
                      label="Title"
                      value={incidentForm.title}
                      onChange={(e) =>
                        setIncidentForm({
                          ...incidentForm,
                          title: e.target.value,
                        })
                      }
                      required
                    />

                    <TextareaField
                      label="Description"
                      value={incidentForm.description}
                      disabled={actionLoading}
                      onChange={(value) =>
                        setIncidentForm({
                          ...incidentForm,
                          description: value,
                        })
                      }
                    />

                    <SelectField
                      label="Severity"
                      value={incidentForm.severity}
                      disabled={actionLoading}
                      onChange={(value) =>
                        setIncidentForm({
                          ...incidentForm,
                          severity: value,
                        })
                      }
                    >
                      {severities.map((severity) => (
                        <option key={severity} value={severity}>
                          {severity}
                        </option>
                      ))}
                    </SelectField>

                    <SelectField
                      label="Status"
                      value={incidentForm.status}
                      disabled={actionLoading}
                      onChange={(value) =>
                        setIncidentForm({
                          ...incidentForm,
                          status: value,
                        })
                      }
                    >
                      {incidentStatuses.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </SelectField>

                    <Input
                      label="Incident Date"
                      type="date"
                      value={incidentForm.incidentDate}
                      onChange={(e) =>
                        setIncidentForm({
                          ...incidentForm,
                          incidentDate: e.target.value,
                        })
                      }
                      required
                    />

                    <Input
                      label="Location"
                      value={incidentForm.location}
                      onChange={(e) =>
                        setIncidentForm({
                          ...incidentForm,
                          location: e.target.value,
                        })
                      }
                    />

                    <TextareaField
                      label="Corrective Action"
                      value={incidentForm.correctiveAction}
                      disabled={actionLoading}
                      onChange={(value) =>
                        setIncidentForm({
                          ...incidentForm,
                          correctiveAction: value,
                        })
                      }
                    />

                    <FormButtons
                      loading={actionLoading}
                      editing={Boolean(editingIncident)}
                      onCancel={() => resetForms()}
                      label="Incident"
                    />
                  </form>
                )}

                {activeForm === 'risk' && (
                  <form onSubmit={saveRisk} aria-busy={actionLoading}>
                    <Input
                      label="Code"
                      value={riskForm.code}
                      onChange={(e) =>
                        setRiskForm({
                          ...riskForm,
                          code: e.target.value,
                        })
                      }
                      required
                    />

                    <Input
                      label="Activity"
                      value={riskForm.activity}
                      onChange={(e) =>
                        setRiskForm({
                          ...riskForm,
                          activity: e.target.value,
                        })
                      }
                      required
                    />

                    <TextareaField
                      label="Hazards"
                      value={riskForm.hazards}
                      disabled={actionLoading}
                      onChange={(value) =>
                        setRiskForm({
                          ...riskForm,
                          hazards: value,
                        })
                      }
                    />

                    <TextareaField
                      label="Risks"
                      value={riskForm.risks}
                      disabled={actionLoading}
                      onChange={(value) =>
                        setRiskForm({
                          ...riskForm,
                          risks: value,
                        })
                      }
                    />

                    <TextareaField
                      label="Controls"
                      value={riskForm.controls}
                      disabled={actionLoading}
                      onChange={(value) =>
                        setRiskForm({
                          ...riskForm,
                          controls: value,
                        })
                      }
                    />

                    <SelectField
                      label="Risk Level"
                      value={riskForm.riskLevel}
                      disabled={actionLoading}
                      onChange={(value) =>
                        setRiskForm({
                          ...riskForm,
                          riskLevel: value,
                        })
                      }
                    >
                      {riskLevels.map((level) => (
                        <option key={level} value={level}>
                          {level}
                        </option>
                      ))}
                    </SelectField>

                    <Input
                      label="Review Date"
                      type="date"
                      value={riskForm.reviewDate}
                      onChange={(e) =>
                        setRiskForm({
                          ...riskForm,
                          reviewDate: e.target.value,
                        })
                      }
                    />

                    <FormButtons
                      loading={actionLoading}
                      editing={Boolean(editingRisk)}
                      onCancel={() => resetForms()}
                      label="Risk Assessment"
                    />
                  </form>
                )}

                {activeForm === 'talk' && (
                  <form onSubmit={saveTalk} aria-busy={actionLoading}>
                    <Input
                      label="Topic"
                      value={talkForm.topic}
                      onChange={(e) =>
                        setTalkForm({
                          ...talkForm,
                          topic: e.target.value,
                        })
                      }
                      required
                    />

                    <Input
                      label="Talk Date"
                      type="date"
                      value={talkForm.talkDate}
                      onChange={(e) =>
                        setTalkForm({
                          ...talkForm,
                          talkDate: e.target.value,
                        })
                      }
                      required
                    />

                    <TextareaField
                      label="Attendees - one name per line"
                      value={talkForm.attendeesText}
                      disabled={actionLoading}
                      onChange={(value) =>
                        setTalkForm({
                          ...talkForm,
                          attendeesText: value,
                        })
                      }
                    />

                    <TextareaField
                      label="Remarks"
                      value={talkForm.remarks}
                      disabled={actionLoading}
                      onChange={(value) =>
                        setTalkForm({
                          ...talkForm,
                          remarks: value,
                        })
                      }
                    />

                    <FormButtons
                      loading={actionLoading}
                      editing={Boolean(editingTalk)}
                      onCancel={() => resetForms()}
                      label="Toolbox Talk"
                    />
                  </form>
                )}

                {activeForm === 'inspection' && (
                  <form onSubmit={saveInspection} aria-busy={actionLoading}>
                    <Input
                      label="Code"
                      value={inspectionForm.code}
                      onChange={(e) =>
                        setInspectionForm({
                          ...inspectionForm,
                          code: e.target.value,
                        })
                      }
                      required
                    />

                    <Input
                      label="Inspection Date"
                      type="date"
                      value={inspectionForm.inspectionDate}
                      onChange={(e) =>
                        setInspectionForm({
                          ...inspectionForm,
                          inspectionDate: e.target.value,
                        })
                      }
                      required
                    />

                    <TextareaField
                      label="Findings"
                      value={inspectionForm.findings}
                      disabled={actionLoading}
                      onChange={(value) =>
                        setInspectionForm({
                          ...inspectionForm,
                          findings: value,
                        })
                      }
                    />

                    <TextareaField
                      label="Actions"
                      value={inspectionForm.actions}
                      disabled={actionLoading}
                      onChange={(value) =>
                        setInspectionForm({
                          ...inspectionForm,
                          actions: value,
                        })
                      }
                    />

                    <FormButtons
                      loading={actionLoading}
                      editing={Boolean(editingInspection)}
                      onCancel={() => resetForms()}
                      label="Safety Inspection"
                    />
                  </form>
                )}
              </Card>
            </div>

            <div style={{ display: 'grid', gap: 20 }}>
              <Card title="Safety Register">
                <Input
                  label="Search"
                  placeholder="Search safety records..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </Card>

              <Card title="Incidents">
                <DataTable<SafetyIncident>
                  columns={[
                    { header: 'Code', accessor: 'code' },
                    { header: 'Title', accessor: 'title' },
                    {
                      header: 'Severity',
                      accessor: (row) => <StatusBadge status={row.severity} />,
                    },
                    {
                      header: 'Status',
                      accessor: (row) => <StatusBadge status={row.status} />,
                    },
                    {
                      header: 'Date',
                      accessor: (row) => formatDate(row.incidentDate),
                    },
                    {
                      header: 'Location',
                      accessor: (row) => row.location || '-',
                    },
                    {
                      header: 'Actions',
                      accessor: (row) => (
                        <div
                          style={{
                            display: 'flex',
                            gap: 6,
                            flexWrap: 'wrap',
                          }}
                        >
                          <IconOnlyButton
                            title="View"
                            disabled={actionLoading}
                            onClick={() =>
                              setViewRecord({
                                type: 'incident',
                                data: row,
                              })
                            }
                          >
                            <Eye size={15} />
                          </IconOnlyButton>

                          {row.status !== 'CLOSED' && (
                            <IconOnlyButton
                              title="Edit"
                              disabled={actionLoading}
                              onClick={() => editIncident(row)}
                            >
                              <Edit size={15} />
                            </IconOnlyButton>
                          )}

                          {row.status === 'CLOSED' ? (
                            <IconOnlyButton
                              title="Reopen"
                              disabled={actionLoading}
                              onClick={() =>
                                runAction(
                                  () => safetyApi.reopenIncident(row.id),
                                  'Incident reopened successfully',
                                  'Failed to reopen incident',
                                )
                              }
                              color="#2563eb"
                            >
                              <RotateCcw size={15} />
                            </IconOnlyButton>
                          ) : (
                            <IconOnlyButton
                              title="Close"
                              disabled={actionLoading}
                              onClick={() =>
                                runAction(
                                  () => safetyApi.closeIncident(row.id),
                                  'Incident closed successfully',
                                  'Failed to close incident',
                                )
                              }
                              color="#16a34a"
                            >
                              <CheckCircle2 size={15} />
                            </IconOnlyButton>
                          )}

                          {row.status !== 'CLOSED' && (
                            <IconOnlyButton
                              title="Delete"
                              disabled={actionLoading}
                              onClick={() =>
                                runAction(
                                  () => safetyApi.removeIncident(row.id),
                                  'Incident deleted successfully',
                                  'Failed to delete incident',
                                )
                              }
                              color="#dc2626"
                            >
                              <Trash2 size={15} />
                            </IconOnlyButton>
                          )}
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
                    {
                      header: 'Risk Level',
                      accessor: (row) => (
                        <StatusBadge status={row.riskLevel || '-'} />
                      ),
                    },
                    {
                      header: 'Review Date',
                      accessor: (row) => formatDate(row.reviewDate),
                    },
                    {
                      header: 'Actions',
                      accessor: (row) => (
                        <ActionButtons
                          loading={actionLoading}
                          onView={() =>
                            setViewRecord({
                              type: 'risk',
                              data: row,
                            })
                          }
                          onEdit={() => editRisk(row)}
                          onDelete={() =>
                            runAction(
                              () => safetyApi.removeRiskAssessment(row.id),
                              'Risk assessment deleted successfully',
                              'Failed to delete risk assessment',
                            )
                          }
                        />
                      ),
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
                    {
                      header: 'Date',
                      accessor: (row) => formatDate(row.talkDate),
                    },
                    {
                      header: 'Attendees',
                      accessor: (row) => row.attendees?.length ?? 0,
                    },
                    {
                      header: 'Remarks',
                      accessor: (row) => truncate(row.remarks),
                    },
                    {
                      header: 'Actions',
                      accessor: (row) => (
                        <ActionButtons
                          loading={actionLoading}
                          onView={() =>
                            setViewRecord({
                              type: 'talk',
                              data: row,
                            })
                          }
                          onEdit={() => editTalk(row)}
                          onDelete={() =>
                            runAction(
                              () => safetyApi.removeToolboxTalk(row.id),
                              'Toolbox talk deleted successfully',
                              'Failed to delete toolbox talk',
                            )
                          }
                        />
                      ),
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
                    {
                      header: 'Date',
                      accessor: (row) => formatDate(row.inspectionDate),
                    },
                    {
                      header: 'Findings',
                      accessor: (row) => truncate(row.findings),
                    },
                    {
                      header: 'Actions Required',
                      accessor: (row) => truncate(row.actions),
                    },
                    {
                      header: 'Actions',
                      accessor: (row) => (
                        <ActionButtons
                          loading={actionLoading}
                          onView={() =>
                            setViewRecord({
                              type: 'inspection',
                              data: row,
                            })
                          }
                          onEdit={() => editInspection(row)}
                          onDelete={() =>
                            runAction(
                              () => safetyApi.removeSafetyInspection(row.id),
                              'Safety inspection deleted successfully',
                              'Failed to delete safety inspection',
                            )
                          }
                        />
                      ),
                    },
                  ]}
                  data={filteredInspections}
                  emptyMessage="No safety inspections found"
                />
              </Card>
            </div>
          </div>
        </>
      )}

      {viewRecord && (
        <SafetyDetailsModal
          record={viewRecord}
          onClose={() => setViewRecord(null)}
          actionLoading={actionLoading}
        />
      )}
    </div>
  );
}

function SafetyLoading() {
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
              animation: 'safety-spin 0.8s linear infinite',
            }}
          />

          <div>
            <strong style={{ color: '#111827' }}>Loading safety records</strong>

            <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: 14 }}>
              Retrieving incidents, risk assessments, toolbox talks, inspections,
              and close-out records from the server. Please wait.
            </p>
          </div>
        </div>

        <Skeleton width="260px" height={38} marginTop={8} />

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
            <div
              style={{
                minHeight: 620,
                padding: 18,
                borderRadius: 14,
                background: '#ffffff',
                border: '1px solid #e5e7eb',
              }}
            >
              <Skeleton width="160px" height={18} />

              {Array.from({ length: 11 }).map((_, index) => (
                <Skeleton
                  key={index}
                  width="100%"
                  height={36}
                  marginTop={18}
                />
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gap: 20 }}>
            {Array.from({ length: 5 }).map((_, cardIndex) => (
              <div
                key={cardIndex}
                style={{
                  minHeight: cardIndex === 0 ? 120 : 260,
                  padding: 18,
                  borderRadius: 14,
                  background: '#ffffff',
                  border: '1px solid #e5e7eb',
                }}
              >
                <Skeleton width="170px" height={18} />

                {Array.from({ length: cardIndex === 0 ? 1 : 5 }).map(
                  (_, index) => (
                    <Skeleton
                      key={index}
                      width="100%"
                      height={30}
                      marginTop={20}
                    />
                  ),
                )}
              </div>
            ))}
          </div>
        </div>

        <style>
          {`
            @keyframes safety-spin {
              to {
                transform: rotate(360deg);
              }
            }

            @keyframes safety-pulse {
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
        animation: 'safety-pulse 1.4s ease-in-out infinite',
      }}
    />
  );
}

function FormButtons({
  loading,
  editing,
  onCancel,
  label,
}: {
  loading: boolean;
  editing: boolean;
  onCancel: () => void;
  label: string;
}) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <Button disabled={loading} style={{ flex: 1 }}>
        {loading ? (
          'Saving...'
        ) : editing ? (
          <>
            <Save size={15} /> Save Changes
          </>
        ) : (
          `Create ${label}`
        )}
      </Button>

      {editing && (
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={loading}
        >
          <X size={15} /> Cancel
        </Button>
      )}
    </div>
  );
}

function ActionButtons({
  loading,
  onView,
  onEdit,
  onDelete,
}: {
  loading: boolean;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      <IconOnlyButton title="View" onClick={onView} disabled={loading}>
        <Eye size={15} />
      </IconOnlyButton>

      <IconOnlyButton title="Edit" onClick={onEdit} disabled={loading}>
        <Edit size={15} />
      </IconOnlyButton>

      <IconOnlyButton
        title="Delete"
        onClick={onDelete}
        disabled={loading}
        color="#dc2626"
      >
        <Trash2 size={15} />
      </IconOnlyButton>
    </div>
  );
}

function SafetyDetailsModal({
  record,
  onClose,
  actionLoading,
}: {
  record: Exclude<ViewRecord, null>;
  onClose: () => void;
  actionLoading: boolean;
}) {
  const data: any = record.data;

  return (
    <div style={modalOverlayStyle} role="dialog" aria-modal="true">
      <div style={modalStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
          <h2 style={{ margin: 0 }}>{record.type.toUpperCase()}</h2>

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
          <Detail label="Code / Topic" value={data.code || data.topic || '-'} />
          <Detail
            label="Title / Activity"
            value={data.title || data.activity || '-'}
          />
          <Detail
            label="Status / Risk"
            value={data.status || data.riskLevel || '-'}
          />
          <Detail
            label="Date"
            value={formatDate(
              data.incidentDate ||
                data.reviewDate ||
                data.talkDate ||
                data.inspectionDate,
            )}
          />
          <Detail
            label="Description / Hazards"
            value={data.description || data.hazards || data.findings || '-'}
            wide
          />
          <Detail
            label="Risks / Actions"
            value={data.risks || data.actions || data.correctiveAction || '-'}
            wide
          />
          <Detail
            label="Controls / Remarks"
            value={data.controls || data.remarks || '-'}
            wide
          />
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

function StatusBadge({ status }: { status?: string }) {
  return <span style={badgeStyle(status || '-')}>{status || '-'}</span>;
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

function filterRecords<T extends Record<string, any>>(
  records: T[],
  keyword: string,
  fields: string[],
) {
  const query = keyword.trim().toLowerCase();

  if (!query) return records;

  return records.filter((record) =>
    fields.some((field) =>
      String(record[field] || '')
        .toLowerCase()
        .includes(query),
    ),
  );
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

const tabStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(4, 1fr)',
  gap: 6,
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

function tabButtonStyle(active: boolean): React.CSSProperties {
  return {
    padding: '8px 10px',
    borderRadius: 8,
    border: '1px solid #dbe3ef',
    background: active ? '#2563eb' : '#fff',
    color: active ? '#fff' : '#1e293b',
    cursor: 'pointer',
    fontWeight: 700,
  };
}

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
    case 'CRITICAL':
    case 'HIGH':
      return { ...base, background: '#fee2e2', color: '#991b1b' };
    case 'MEDIUM':
    case 'INVESTIGATING':
      return { ...base, background: '#fef9c3', color: '#854d0e' };
    case 'LOW':
      return { ...base, background: '#dcfce7', color: '#166534' };
    case 'CLOSED':
      return { ...base, background: '#e5e7eb', color: '#374151' };
    default:
      return { ...base, background: '#dbeafe', color: '#1d4ed8' };
  }
}