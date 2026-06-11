import { useEffect, useMemo, useState } from 'react';
import {
  Download,
  Edit,
  FileJson,
  FileSpreadsheet,
  FileText,
  RefreshCcw,
  Save,
  X,
} from 'lucide-react';
import html2pdf from 'html2pdf.js';

import { reportsApi } from '../../api/reports.api';
import { projectsApi } from '../../api/projects.api';
import type { Project } from '../../api/projects.api';
import { Button, Card, DataTable, Input, PageHeader } from '../../components/ui';

type EditableReportNote = {
  projectId: number | '';
  preparedBy: string;
  reportTitle: string;
  remarks: string;
};

const emptyNote: EditableReportNote = {
  projectId: '',
  preparedBy: '',
  reportTitle: 'Project Executive Report',
  remarks: '',
};

export default function ReportsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | ''>('');
  const [dashboardReport, setDashboardReport] = useState<any>(null);
  const [projectReport, setProjectReport] = useState<any>(null);

  const [pageLoading, setPageLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState<EditableReportNote>(emptyNote);

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === Number(selectedProjectId)),
    [projects, selectedProjectId],
  );

  const reportFileName = useMemo(() => {
    const code = selectedProject?.code || 'all-projects';
    const date = new Date().toISOString().slice(0, 10);

    return `buildpro-${code}-report-${date}`;
  }, [selectedProject]);

  const isSuccess = message.toLowerCase().includes('successfully');

  useEffect(() => {
    loadInitialData();
  }, []);

  async function loadInitialData() {
    try {
      setPageLoading(true);
      setMessage('');

      const [projectData, dashboardData] = await Promise.all([
        projectsApi.findAll(),
        reportsApi.getDashboardReport(),
      ]);

      setProjects(projectData);
      setDashboardReport(dashboardData);

      if (projectData.length > 0) {
        const firstProjectId = projectData[0].id;

        setSelectedProjectId(firstProjectId);
        setNote((prev) => ({
          ...prev,
          projectId: firstProjectId,
        }));

        const reportData = await reportsApi.getProjectReport(firstProjectId);
        setProjectReport(reportData);
      } else {
        setSelectedProjectId('');
        setProjectReport(null);
        setNote(emptyNote);
      }
    } catch (error: any) {
      setMessage(getErrorMessage(error, 'Failed to load reports'));
    } finally {
      setPageLoading(false);
    }
  }

  async function loadProjectReport(projectId: number) {
    if (!projectId) {
      setProjectReport(null);
      return;
    }

    const data = await reportsApi.getProjectReport(projectId);
    setProjectReport(data);
  }

  async function handleProjectChange(value: string) {
    try {
      setActionLoading(true);
      setMessage('');

      const projectId = Number(value);

      setSelectedProjectId(projectId || '');
      setNote((prev) => ({
        ...prev,
        projectId: projectId || '',
      }));

      if (projectId) {
        await loadProjectReport(projectId);
      } else {
        setProjectReport(null);
      }
    } catch (error: any) {
      setMessage(getErrorMessage(error, 'Failed to load project report'));
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRefreshAll() {
    try {
      setActionLoading(true);
      setMessage('');

      const dashboardData = await reportsApi.getDashboardReport();
      setDashboardReport(dashboardData);

      if (selectedProjectId) {
        await loadProjectReport(Number(selectedProjectId));
      }

      setMessage('Reports refreshed successfully');
    } catch (error: any) {
      setMessage(getErrorMessage(error, 'Failed to refresh reports'));
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRefreshProject() {
    if (!selectedProjectId) return;

    try {
      setActionLoading(true);
      setMessage('');

      await loadProjectReport(Number(selectedProjectId));

      setMessage('Project report refreshed successfully');
    } catch (error: any) {
      setMessage(getErrorMessage(error, 'Failed to refresh project report'));
    } finally {
      setActionLoading(false);
    }
  }

  function updateNoteField(name: keyof EditableReportNote, value: string | number) {
    setNote((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function saveEdit() {
    setEditing(false);
    setMessage('Report notes updated successfully');
  }

  function cancelEdit() {
    setEditing(false);
    setNote((prev) => ({
      ...prev,
      projectId: selectedProjectId,
    }));
  }

  function buildExportData() {
    return {
      reportTitle: note.reportTitle,
      project: selectedProject
        ? {
            id: selectedProject.id,
            code: selectedProject.code,
            name: selectedProject.name,
          }
        : null,
      preparedBy: note.preparedBy || 'System Administrator',
      remarks: note.remarks,
      dashboardReport,
      projectReport,
      exportedAt: new Date().toISOString(),
    };
  }

  function downloadFile(content: string, fileName: string, mimeType: string) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = fileName;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }

  function exportJson() {
    downloadFile(
      JSON.stringify(buildExportData(), null, 2),
      `${reportFileName}.json`,
      'application/json;charset=utf-8',
    );
  }

  function exportCsv() {
    const rows = [
      ['Section', 'Metric', 'Value'],
      ['System Summary', 'Companies', dashboardReport?.companies ?? '-'],
      ['System Summary', 'Projects', dashboardReport?.projects ?? '-'],
      ['System Summary', 'Open RFIs', dashboardReport?.openRfis ?? '-'],
      [
        'System Summary',
        'Pending Approvals',
        dashboardReport?.pendingApprovals ?? '-',
      ],
      [
        'System Summary',
        'Safety Incidents',
        dashboardReport?.safetyIncidents ?? '-',
      ],
      ['System Summary', 'Documents', dashboardReport?.documents ?? '-'],
      ['Cost Summary', 'BOQ Total', projectReport?.costSummary?.boqTotal ?? '-'],
      [
        'Cost Summary',
        'Budget Total',
        projectReport?.costSummary?.budgetTotal ?? '-',
      ],
      [
        'Cost Summary',
        'Approved Variations',
        projectReport?.costSummary?.approvedVariationTotal ?? '-',
      ],
      [
        'Cost Summary',
        'Revised Budget',
        projectReport?.costSummary?.revisedBudget ?? '-',
      ],
      [
        'Cost Summary',
        'Actual Cost',
        projectReport?.costSummary?.actualCost ?? '-',
      ],
      [
        'Cost Summary',
        'Remaining Budget',
        projectReport?.costSummary?.remainingBudget ?? '-',
      ],
      ['Cash Flow', 'Invoiced Amount', projectReport?.cashFlow?.invoicedAmount ?? '-'],
      ['Cash Flow', 'Received Amount', projectReport?.cashFlow?.receivedAmount ?? '-'],
      ['Cash Flow', 'Expense Amount', projectReport?.cashFlow?.expenseAmount ?? '-'],
      ['Cash Flow', 'Retention Held', projectReport?.cashFlow?.retentionHeld ?? '-'],
      [
        'Cash Flow',
        'Advance Deducted',
        projectReport?.cashFlow?.advanceDeducted ?? '-',
      ],
      ['Cash Flow', 'Net Cash Flow', projectReport?.cashFlow?.netCashFlow ?? '-'],
      [
        'Cash Flow',
        'Outstanding Receivable',
        projectReport?.cashFlow?.outstandingReceivable ?? '-',
      ],
    ];

    const csv = rows
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','),
      )
      .join('\n');

    downloadFile(csv, `${reportFileName}.csv`, 'text/csv;charset=utf-8');
  }

  function exportPdf() {
    const element = document.getElementById('printable-report');

    if (!element) {
      setMessage('Printable report section not found');
      return;
    }

    html2pdf()
      .set({
        margin: 10,
        filename: `${reportFileName}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      })
      .from(element)
      .save();
  }

  return (
    <div>
      <PageHeader
        title="Reports"
        description="View, edit, export, and download executive project performance reports."
      />

      {message && <Alert type={isSuccess ? 'success' : 'error'}>{message}</Alert>}

      {pageLoading ? (
        <ReportsLoading />
      ) : (
        <>
          <div style={actionBarStyle}>
            <IconActionButton
              title="Download JSON"
              onClick={exportJson}
              disabled={actionLoading}
            >
              <FileJson size={16} />
              JSON
            </IconActionButton>

            <IconActionButton
              title="Download CSV"
              onClick={exportCsv}
              disabled={actionLoading}
            >
              <FileSpreadsheet size={16} />
              CSV
            </IconActionButton>

            <IconActionButton
              title="Download PDF"
              onClick={exportPdf}
              disabled={actionLoading}
            >
              <FileText size={16} />
              PDF
            </IconActionButton>

            <IconActionButton
              title="Refresh Report"
              onClick={handleRefreshAll}
              disabled={actionLoading}
            >
              <RefreshCcw size={16} />
              Refresh
            </IconActionButton>
          </div>

          <div className="module-grid">
            <div className="module-sidebar">
              <Card title="Report Filters">
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

                <Button
                  style={{ width: '100%' }}
                  disabled={!selectedProjectId || actionLoading}
                  onClick={handleRefreshProject}
                >
                  {actionLoading ? 'Refreshing...' : 'Refresh Report'}
                </Button>
              </Card>

              <Card title="Report Information">
                {editing ? (
                  <div aria-busy={actionLoading}>
                    <Input
                      label="Report Title"
                      value={note.reportTitle}
                      onChange={(event) =>
                        updateNoteField('reportTitle', event.target.value)
                      }
                    />

                    <Input
                      label="Prepared By"
                      value={note.preparedBy}
                      onChange={(event) =>
                        updateNoteField('preparedBy', event.target.value)
                      }
                      placeholder="System Administrator"
                    />

                    <TextAreaField
                      label="Remarks"
                      value={note.remarks}
                      disabled={actionLoading}
                      onChange={(value) => updateNoteField('remarks', value)}
                      placeholder="Add executive remarks, risks, decisions, or observations."
                    />

                    <div style={{ display: 'flex', gap: 8 }}>
                      <Button
                        style={{ flex: 1 }}
                        onClick={saveEdit}
                        disabled={actionLoading}
                      >
                        <Save size={15} /> Save
                      </Button>

                      <Button
                        type="button"
                        variant="secondary"
                        onClick={cancelEdit}
                        disabled={actionLoading}
                      >
                        <X size={15} /> Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: 10 }}>
                    <ReportItem label="Title" value={note.reportTitle} />
                    <ReportItem
                      label="Project"
                      value={
                        selectedProject
                          ? `${selectedProject.code} - ${selectedProject.name}`
                          : '-'
                      }
                    />
                    <ReportItem
                      label="Prepared By"
                      value={note.preparedBy || 'System Administrator'}
                    />
                    <ReportItem label="Remarks" value={note.remarks || '-'} />

                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setEditing(true)}
                      disabled={actionLoading}
                    >
                      <Edit size={15} /> Edit Report Info
                    </Button>
                  </div>
                )}
              </Card>

              <Card title="System Summary">
                {dashboardReport ? (
                  <div style={{ display: 'grid', gap: 10 }}>
                    <ReportItem label="Companies" value={dashboardReport.companies} />
                    <ReportItem label="Projects" value={dashboardReport.projects} />
                    <ReportItem label="Open RFIs" value={dashboardReport.openRfis} />
                    <ReportItem
                      label="Pending Approvals"
                      value={dashboardReport.pendingApprovals}
                    />
                    <ReportItem
                      label="Safety Incidents"
                      value={dashboardReport.safetyIncidents}
                    />
                    <ReportItem label="Documents" value={dashboardReport.documents} />
                  </div>
                ) : (
                  <p>No dashboard report loaded</p>
                )}
              </Card>
            </div>

            <div className="module-content" id="printable-report">
              <Card title={note.reportTitle || 'Project Executive Report'}>
                <div style={reportHeaderStyle}>
                  <div>
                    <strong>Project</strong>
                    <p>
                      {selectedProject
                        ? `${selectedProject.code} - ${selectedProject.name}`
                        : '-'}
                    </p>
                  </div>

                  <div>
                    <strong>Prepared By</strong>
                    <p>{note.preparedBy || 'System Administrator'}</p>
                  </div>

                  <div>
                    <strong>Generated</strong>
                    <p>{new Date().toLocaleString()}</p>
                  </div>
                </div>

                {note.remarks && (
                  <div style={remarksStyle}>
                    <strong>Executive Remarks</strong>
                    <p>{note.remarks}</p>
                  </div>
                )}
              </Card>

              <Card title="Project Cost Report">
                {projectReport?.costSummary ? (
                  <DataTable<any>
                    columns={[
                      { header: 'Metric', accessor: 'metric' },
                      { header: 'Value', accessor: (row) => money(row.value) },
                    ]}
                    data={[
                      {
                        metric: 'BOQ Total',
                        value: projectReport.costSummary.boqTotal,
                      },
                      {
                        metric: 'Budget Total',
                        value: projectReport.costSummary.budgetTotal,
                      },
                      {
                        metric: 'Approved Variations',
                        value:
                          projectReport.costSummary.approvedVariationTotal,
                      },
                      {
                        metric: 'Revised Budget',
                        value: projectReport.costSummary.revisedBudget,
                      },
                      {
                        metric: 'Actual Cost',
                        value: projectReport.costSummary.actualCost,
                      },
                      {
                        metric: 'Remaining Budget',
                        value: projectReport.costSummary.remainingBudget,
                      },
                    ]}
                  />
                ) : (
                  <p>No project cost report available</p>
                )}
              </Card>

              <Card title="Project Cash Flow Report">
                {projectReport?.cashFlow ? (
                  <DataTable<any>
                    columns={[
                      { header: 'Metric', accessor: 'metric' },
                      { header: 'Value', accessor: (row) => money(row.value) },
                    ]}
                    data={[
                      {
                        metric: 'Invoiced Amount',
                        value: projectReport.cashFlow.invoicedAmount,
                      },
                      {
                        metric: 'Received Amount',
                        value: projectReport.cashFlow.receivedAmount,
                      },
                      {
                        metric: 'Expense Amount',
                        value: projectReport.cashFlow.expenseAmount,
                      },
                      {
                        metric: 'Retention Held',
                        value: projectReport.cashFlow.retentionHeld,
                      },
                      {
                        metric: 'Advance Deducted',
                        value: projectReport.cashFlow.advanceDeducted,
                      },
                      {
                        metric: 'Net Cash Flow',
                        value: projectReport.cashFlow.netCashFlow,
                      },
                      {
                        metric: 'Outstanding Receivable',
                        value: projectReport.cashFlow.outstandingReceivable,
                      },
                    ]}
                  />
                ) : (
                  <p>No project cash flow report available</p>
                )}
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ReportsLoading() {
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
              animation: 'reports-spin 0.8s linear infinite',
            }}
          />

          <div>
            <strong style={{ color: '#111827' }}>Loading reports</strong>

            <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: 14 }}>
              Retrieving dashboard summary, project cost report, cash flow
              metrics, and export-ready report data from the server. Please wait.
            </p>
          </div>
        </div>

        <div style={actionBarStyle}>
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} width="110px" height={38} />
          ))}
        </div>

        <div className="module-grid">
          <div className="module-sidebar">
            {Array.from({ length: 3 }).map((_, cardIndex) => (
              <div
                key={cardIndex}
                style={{
                  minHeight: cardIndex === 0 ? 150 : 250,
                  padding: 18,
                  marginBottom: 16,
                  borderRadius: 14,
                  background: '#ffffff',
                  border: '1px solid #e5e7eb',
                }}
              >
                <Skeleton width="170px" height={18} />

                {Array.from({ length: cardIndex === 0 ? 3 : 6 }).map(
                  (_, index) => (
                    <Skeleton
                      key={index}
                      width="100%"
                      height={32}
                      marginTop={18}
                    />
                  ),
                )}
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gap: 20 }}>
            {Array.from({ length: 3 }).map((_, cardIndex) => (
              <div
                key={cardIndex}
                style={{
                  minHeight: cardIndex === 0 ? 190 : 280,
                  padding: 18,
                  borderRadius: 14,
                  background: '#ffffff',
                  border: '1px solid #e5e7eb',
                }}
              >
                <Skeleton width="220px" height={18} />

                {Array.from({ length: cardIndex === 0 ? 4 : 7 }).map(
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
            @keyframes reports-spin {
              to {
                transform: rotate(360deg);
              }
            }

            @keyframes reports-pulse {
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
        animation: 'reports-pulse 1.4s ease-in-out infinite',
      }}
    />
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
        background: success ? '#dcfce7' : '#fef2f2',
        border: success ? '1px solid #86efac' : '1px solid #fecaca',
        color: success ? '#166534' : '#991b1b',
        fontWeight: 600,
      }}
    >
      {children}
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

function ReportItem({ label, value }: { label: string; value: number | string }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: 12,
        borderBottom: '1px solid #f3f4f6',
        paddingBottom: 8,
      }}
    >
      <span style={{ color: '#64748b' }}>{label}</span>
      <strong style={{ textAlign: 'right' }}>{value}</strong>
    </div>
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
        onChange={(event) => onChange(event.target.value)}
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
  placeholder,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
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
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
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

function money(value?: string | number | null) {
  if (value === null || value === undefined || value === '') return '-';

  return Number(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function getErrorMessage(error: any, fallback: string) {
  return error?.response?.data?.message || error?.message || fallback;
}

const actionBarStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  flexWrap: 'wrap',
  gap: 8,
  marginBottom: 16,
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

const fieldStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 8,
  border: '1px solid #d1d5db',
};

const reportHeaderStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: 16,
};

const remarksStyle: React.CSSProperties = {
  marginTop: 16,
  padding: 12,
  borderRadius: 8,
  background: '#f8fafc',
  border: '1px solid #e2e8f0',
};