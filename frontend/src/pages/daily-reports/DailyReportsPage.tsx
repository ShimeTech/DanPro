import { useEffect, useMemo, useState } from 'react';
import {
  Download,
  Edit,
  Eye,
  FileJson,
  FileSpreadsheet,
  FileText,
  RefreshCcw,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import html2pdf from 'html2pdf.js';

import { dailyReportsApi } from '../../api/daily-reports.api';
import type {
  CreateDailyReportPayload,
  DailyReport,
} from '../../api/daily-reports.api';
import { projectsApi } from '../../api/projects.api';
import type { Project } from '../../api/projects.api';
import { Button, Card, DataTable, Input, PageHeader } from '../../components/ui';

type DailyReportForm = CreateDailyReportPayload;

type ReportMode = 'create' | 'edit';

const emptyForm: DailyReportForm = {
  projectId: 0,
  reportDate: '',
  weather: '',
  manpowerCount: 0,
  equipmentUsed: '',
  workCompleted: '',
  materialReceived: '',
  sitePhotos: [],
  issues: '',
  delays: '',
  remarks: '',
};

export default function DailyReportsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | ''>('');
  const [selectedReport, setSelectedReport] = useState<DailyReport | null>(null);
  const [editingReport, setEditingReport] = useState<DailyReport | null>(null);
  const [mode, setMode] = useState<ReportMode>('create');
  const [exportScope, setExportScope] = useState<'all' | 'date'>('all');
  const [exportDate, setExportDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');

  const [form, setForm] = useState<DailyReportForm>(emptyForm);

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === Number(selectedProjectId)),
    [projects, selectedProjectId],
  );

  const filteredReports = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) return reports;

    return reports.filter((report) => {
      return (
        String(report.weather || '').toLowerCase().includes(keyword) ||
        String(report.workCompleted || '').toLowerCase().includes(keyword) ||
        String(report.issues || '').toLowerCase().includes(keyword) ||
        String(report.delays || '').toLowerCase().includes(keyword) ||
        String(report.remarks || '').toLowerCase().includes(keyword) ||
        String(report.preparedBy?.name || '').toLowerCase().includes(keyword)
      );
    });
  }, [reports, search]);

  const reportFileName = useMemo(() => {
    const projectCode = selectedProject?.code || 'project';
    const date = new Date().toISOString().slice(0, 10);
    return `buildpro-daily-reports-${projectCode}-${date}`;
  }, [selectedProject]);

  const isSuccess =
    message.toLowerCase().includes('successfully');

  useEffect(() => {
    loadProjects();
  }, []);

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

  async function loadReports(projectId: number) {
    if (!projectId) {
      setReports([]);
      return;
    }

    try {
      setLoading(true);
      setMessage('');

      const data = await dailyReportsApi.findByProject(projectId);
      setReports(data);
    } catch (error: any) {
      setMessage(getErrorMessage(error, 'Failed to load daily reports'));
    } finally {
      setLoading(false);
    }
  }

  async function handleProjectChange(value: string) {
    const projectId = Number(value);

    setSelectedProjectId(projectId || '');
    setSelectedReport(null);
    setEditingReport(null);
    setMode('create');

    setForm({
      ...emptyForm,
      projectId,
    });

    if (projectId) {
      await loadReports(projectId);

      try {
        const defaults = await dailyReportsApi.getProjectDefaults(projectId);

        setForm((prev) => ({
          ...prev,
          projectId,
          weather: defaults.weather || '',
          manpowerCount: defaults.manpowerCount ?? 0,
          materialReceived: defaults.materialReceived || '',
        }));
      } catch (error) {
        console.error('Failed to load project defaults', error);
      }
    } else {
      setReports([]);
    }
  }

  function updateField(
    name: keyof DailyReportForm,
    value: string | number | string[],
  ) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function validateForm() {
    if (!form.projectId) return 'Project is required';
    if (!form.reportDate) return 'Report date is required';
    if (Number(form.manpowerCount ?? 0) < 0) {
      return 'Manpower count cannot be negative';
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
      setLoading(true);
      setMessage('');

      const projectId = Number(form.projectId);

      const payload: CreateDailyReportPayload = {
        ...form,
        projectId,
        manpowerCount: Number(form.manpowerCount || 0),
        weather: form.weather?.trim() || '',
        equipmentUsed: form.equipmentUsed?.trim() || '',
        workCompleted: form.workCompleted?.trim() || '',
        materialReceived: form.materialReceived?.trim() || '',
        issues: form.issues?.trim() || '',
        delays: form.delays?.trim() || '',
        remarks: form.remarks?.trim() || '',
      };

      let successMessage = '';

      if (mode === 'edit' && editingReport) {
        await dailyReportsApi.update(editingReport.id, payload);
        successMessage = 'Daily report updated successfully';
      } else {
        await dailyReportsApi.create(payload);
        successMessage = 'Daily report created successfully';
      }

      const data = await dailyReportsApi.findByProject(projectId);
      setReports(data);

      setMode('create');
      setEditingReport(null);
      setForm({
        ...emptyForm,
        projectId,
      });

      setMessage(successMessage);
    } catch (error: any) {
      setMessage(
        getErrorMessage(
          error,
          mode === 'edit'
            ? 'Failed to update daily report'
            : 'Failed to create daily report',
        ),
      );
    } finally {
      setLoading(false);
    }
  }

  function resetForm(projectId = Number(selectedProjectId || 0)) {
    setMode('create');
    setEditingReport(null);
    setForm({
      ...emptyForm,
      projectId,
    });
  }

  function handleView(report: DailyReport) {
    setSelectedReport(report);
  }

  function handleEdit(report: DailyReport) {
    setMode('edit');
    setEditingReport(report);
    setSelectedReport(null);

    setForm({
      projectId: report.projectId,
      reportDate: toDateInputValue(report.reportDate),
      weather: report.weather || '',
      manpowerCount: report.manpowerCount ?? 0,
      equipmentUsed: report.equipmentUsed || '',
      workCompleted: report.workCompleted || '',
      materialReceived: report.materialReceived || '',
      sitePhotos: report.sitePhotos || [],
      issues: report.issues || '',
      delays: report.delays || '',
      remarks: report.remarks || '',
    });
  }

  async function handleDelete(id: number) {
    const confirmed = window.confirm('Delete this daily report? This action will be recorded in the audit log.');
    if (!confirmed) return;

    try {
      setLoading(true);
      setMessage('');

      await dailyReportsApi.remove(id);
      setMessage('Daily report deleted successfully');

      if (selectedProjectId) {
        await loadReports(Number(selectedProjectId));
      }
    } catch (error: any) {
      setMessage(getErrorMessage(error, 'Failed to delete daily report'));
    } finally {
      setLoading(false);
    }
  }

  function buildExportData() {
    return {
      project: selectedProject
        ? {
          id: selectedProject.id,
          code: selectedProject.code,
          name: selectedProject.name,
        }
        : null,
      reports,
      exportedAt: new Date().toISOString(),
    };
  }
  function PdfDetail({ label, value }: { label: string; value: string }) {
    return (
      <div>
        <div style={pdfLabelStyle}>{label}</div>
        <div style={pdfValueStyle}>{value}</div>
      </div>
    );
  }

  function PdfBlock({ label, value }: { label: string; value?: string | null }) {
    return (
      <div style={pdfBlockStyle}>
        <div style={pdfLabelStyle}>{label}</div>
        <div style={pdfTextStyle}>{value || '-'}</div>
      </div>
    );
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
      [
        'Date',
        'Project',
        'Weather',
        'Manpower',
        'Equipment Used',
        'Work Completed',
        'Material Received',
        'Issues',
        'Delays',
        'Remarks',
        'Prepared By',
      ],
      ...reports.map((report) => [
        formatDate(report.reportDate),
        `${report.project?.code || selectedProject?.code || ''} - ${report.project?.name || selectedProject?.name || ''}`,
        report.weather || '',
        report.manpowerCount ?? 0,
        report.equipmentUsed || '',
        report.workCompleted || '',
        report.materialReceived || '',
        report.issues || '',
        report.delays || '',
        report.remarks || '',
        report.preparedBy?.name || '',
      ]),
    ];

    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    downloadFile(csv, `${reportFileName}.csv`, 'text/csv;charset=utf-8');
  }


  const exportReports = useMemo(() => {
    if (exportScope === 'date' && exportDate) {
      return reports.filter((report) => dateKey(report.reportDate) === exportDate);
    }

    return reports;
  }, [reports, exportScope, exportDate]);


  function exportPdf() {
  if (exportScope === 'date' && !exportDate) {
    setMessage('Please select report date');
    return;
  }

  if (exportReports.length === 0) {
    setMessage('No reports found for selected export option');
    return;
  }

  const printable = document.createElement('div');
  printable.innerHTML = buildPdfHtml(exportReports);
  printable.style.width = '700px';
  printable.style.background = '#ffffff';
  printable.style.color = '#111827';
  printable.style.fontFamily = 'Arial, sans-serif';

  document.body.appendChild(printable);

  const fileDate =
    exportScope === 'date'
      ? exportDate
      : new Date().toISOString().slice(0, 10);

  html2pdf()
    .set({
      margin: 12,
      filename: `daily-site-report-${selectedProject?.code || 'project'}-${fileDate}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      },
      jsPDF: {
        unit: 'mm',
        format: 'a4',
        orientation: 'portrait',
      },
      pagebreak: {
        mode: ['css', 'legacy'],
        avoid: ['.avoid-break'],
      },
    })
    .from(printable)
    .save()
    .then(() => {
      document.body.removeChild(printable);
    })
    .catch(() => {
      document.body.removeChild(printable);
      setMessage('Failed to export PDF');
    });
}

  function buildPdfHtml(items: DailyReport[]) {
  const projectTitle = selectedProject
    ? `${selectedProject.code} - ${selectedProject.name}`
    : 'Selected Project';

  const generatedAt = new Date().toLocaleString();

  return `
    <div style="font-family:Arial,sans-serif;color:#111827;">
      ${items
        .map(
          (report, index) => `
            <div style="
              padding:14px;
              page-break-after:${index === items.length - 1 ? 'auto' : 'always'};
            ">
              <div style="
                border-bottom:3px solid #111827;
                padding-bottom:10px;
                margin-bottom:12px;
              ">
                <h1 style="margin:0;font-size:22px;font-weight:800;">
                  DAILY SITE REPORT
                </h1>

                <div style="font-size:12px;margin-top:4px;color:#374151;">
                  ${escapeHtml(projectTitle)}
                </div>
              </div>

              <div style="
                display:grid;
                grid-template-columns:repeat(3, 1fr);
                gap:8px;
                background:#f9fafb;
                border:1px solid #e5e7eb;
                padding:10px;
                margin-bottom:10px;
              ">
                ${pdfField('Report No', `DSR-${String(report.id).padStart(5, '0')}`)}
                ${pdfField('Report Date', formatDate(report.reportDate))}
                ${pdfField('Generated', generatedAt)}

                ${pdfField('Project', report.project ? `${report.project.code} - ${report.project.name}` : projectTitle)}
                ${pdfField('Prepared By', report.preparedBy?.name || '-')}
                ${pdfField('Weather', report.weather || '-')}

                ${pdfField('Manpower', String(report.manpowerCount ?? 0))}
                ${pdfField('Status', 'Submitted')}
                ${pdfField('Document Type', 'Daily Site Report')}
              </div>

              ${pdfBlock('Equipment Used', report.equipmentUsed)}
              ${pdfBlock('Work Completed', report.workCompleted)}
              ${pdfBlock('Material Received', report.materialReceived)}
              ${pdfBlock('Issues / Constraints', report.issues)}
              ${pdfBlock('Delays', report.delays)}
              ${pdfBlock('Remarks', report.remarks)}

              <div class="avoid-break" style="
                display:grid;
                grid-template-columns:1fr 1fr 1fr;
                gap:14px;
                margin-top:16px;
                padding-top:14px;
                border-top:2px solid #e5e7eb;
                font-size:11px;
                page-break-inside:avoid;
                break-inside:avoid;
              ">
                ${signatureBlock('Prepared By')}
                ${signatureBlock('Reviewed By')}
                ${signatureBlock('Approved By')}
              </div>

              <div class="avoid-break" style="
                margin-top:12px;
                font-size:9px;
                color:#6b7280;
                border-top:1px solid #e5e7eb;
                padding-top:6px;
                display:flex;
                justify-content:space-between;
                page-break-inside:avoid;
                break-inside:avoid;
              ">
                <span>BuildPro IMS - Daily Site Report</span>
                <span>Controlled document generated electronically</span>
              </div>
            </div>
          `,
        )
        .join('')}
    </div>
  `;
}

  function pdfField(label: string, value: string) {
    return `
    <div>
      <div style="font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;margin-bottom:4px;">
        ${escapeHtml(label)}
      </div>
      <div style="font-size:12px;font-weight:700;color:#111827;">
        ${escapeHtml(value)}
      </div>
    </div>
  `;
  }

  function pdfBlock(label: string, value?: string | null) {
    return `
    <div style="
      border:1px solid #e5e7eb;
      margin-top:7px;
      page-break-inside:avoid;
      break-inside:avoid;
    ">
      <div style="
        background:#f3f4f6;
        padding:6px 9px;
        font-size:11px;
        font-weight:700;
        color:#374151;
        text-transform:uppercase;
      ">
        ${escapeHtml(label)}
      </div>

      <div style="
        min-height:26px;
        padding:8px 10px;
        font-size:12px;
        line-height:1.35;
        white-space:pre-wrap;
      ">
        ${escapeHtml(value || '-')}
      </div>
    </div>
  `;
  }
  function signatureBlock(label: string) {
    return `
    <div>
      <strong>${escapeHtml(label)}</strong>
      <div style="margin-top:22px;border-top:1px solid #111827;padding-top:5px;">
        Name / Signature / Date
      </div>
    </div>
  `;
  }
  function escapeHtml(value: string) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }
  return (
    <div>
      <PageHeader
        title="Daily Reports"
        description="Record, review, edit, export, and audit daily site reports."
      />

      {message && (
        <div
          style={{
            marginBottom: 16,
            padding: 12,
            borderRadius: 8,
            fontWeight: 600,
            background: isSuccess ? '#dcfce7' : '#fee2e2',
            color: isSuccess ? '#166534' : '#991b1b',
            border: isSuccess ? '1px solid #86efac' : '1px solid #fca5a5',
          }}
        >
          {message}
        </div>
      )}

      <div style={summaryGridStyle}>
        <MetricCard label="Total Reports" value={reports.length} />
        <MetricCard label="Selected Project" value={selectedProject?.code || '-'} />
        <MetricCard
          label="Total Manpower"
          value={reports.reduce((sum, item) => sum + Number(item.manpowerCount || 0), 0)}
        />
        <MetricCard
          label="Reports With Issues"
          value={reports.filter((item) => Boolean(item.issues)).length}
        />
      </div>

      <div style={exportOptionsStyle}>
        <SelectField
          label="PDF Export Scope"
          value={exportScope}
          onChange={(value) => setExportScope(value as 'all' | 'date')}
        >
          <option value="all">All Reports</option>
          <option value="date">Specific Date</option>
        </SelectField>

        {exportScope === 'date' && (
          <SelectField
            label="Export Date"
            value={exportDate}
            onChange={setExportDate}
          >
            <option value="">Select report date</option>
            {reports.map((report) => (
              <option key={report.id} value={dateKey(report.reportDate)}>
                {formatDate(report.reportDate)}
              </option>
            ))}
          </SelectField>
        )}
      </div>

      <div style={actionBarStyle}>
        <IconActionButton title="Download JSON" onClick={exportJson}>
          <FileJson size={16} /> JSON
        </IconActionButton>

        <IconActionButton title="Download CSV" onClick={exportCsv}>
          <FileSpreadsheet size={16} /> CSV
        </IconActionButton>

        <IconActionButton title="Download PDF" onClick={exportPdf}>
          <FileText size={16} /> PDF
        </IconActionButton>

        <IconActionButton
          title="Refresh"
          onClick={() => selectedProjectId && loadReports(Number(selectedProjectId))}
        >
          <RefreshCcw size={16} /> Refresh
        </IconActionButton>
      </div>

      <div className="module-grid">
        <Card
          title={
            mode === 'edit'
              ? `Edit Daily Report: ${formatDate(editingReport?.reportDate)}`
              : 'Create Daily Report'
          }
        >
          <form onSubmit={handleSubmit}>
            <SelectField label="Project" value={form.projectId} onChange={handleProjectChange}>
              <option value={0}>Select project</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.code} - {project.name}
                </option>
              ))}
            </SelectField>

            <Input
              label="Report Date"
              type="date"
              value={form.reportDate}
              onChange={(event) => updateField('reportDate', event.target.value)}
              required
            />

            <Input
              label="Weather"
              value={form.weather}
              onChange={(event) => updateField('weather', event.target.value)}
              placeholder="Sunny, cloudy, rainy..."
            />

            <Input
              label="Manpower Count"
              type="number"
              min={0}
              value={form.manpowerCount ?? 0}
              onChange={(event) => updateField('manpowerCount', Number(event.target.value))}
            />

            <TextareaField
              label="Equipment Used"
              value={form.equipmentUsed ?? ''}
              onChange={(value) => updateField('equipmentUsed', value)}
            />

            <TextareaField
              label="Work Completed"
              value={form.workCompleted ?? ''}
              onChange={(value) => updateField('workCompleted', value)}
            />

            <TextareaField
              label="Material Received"
              value={form.materialReceived ?? ''}
              onChange={(value) => updateField('materialReceived', value)}
            />

            <TextareaField
              label="Issues"
              value={form.issues ?? ''}
              onChange={(value) => updateField('issues', value)}
            />

            <TextareaField
              label="Delays"
              value={form.delays ?? ''}
              onChange={(value) => updateField('delays', value)}
            />

            <TextareaField
              label="Remarks"
              value={form.remarks ?? ''}
              onChange={(value) => updateField('remarks', value)}
            />

            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <Button disabled={loading} style={{ flex: 1 }}>
                {loading ? 'Saving...' : mode === 'edit' ? 'Save Changes' : 'Create Report'}
              </Button>

              {mode === 'edit' && (
                <Button type="button" variant="secondary" onClick={() => resetForm()}>
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </Card>

        <Card title="Daily Report Register">
          <div style={toolbarStyle}>
            <Input
              label="Search"
              placeholder="Search weather, work, issues, delays..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          {loading && <p>Loading...</p>}

          <div id="daily-reports-printable">
            <DataTable<DailyReport>
              columns={[
                { header: 'Date', accessor: (row) => formatDate(row.reportDate) },
                { header: 'Weather', accessor: (row) => row.weather || '-' },
                { header: 'Manpower', accessor: 'manpowerCount' },
                { header: 'Work Completed', accessor: (row) => truncate(row.workCompleted) },
                { header: 'Issues', accessor: (row) => truncate(row.issues) },
                { header: 'Delays', accessor: (row) => truncate(row.delays) },
                { header: 'Prepared By', accessor: (row) => row.preparedBy?.name || '-' },
                {
                  header: 'Actions',
                  accessor: (row) => (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <IconOnlyButton title="View" onClick={() => handleView(row)}>
                        <Eye size={15} />
                      </IconOnlyButton>

                      <IconOnlyButton title="Edit" onClick={() => handleEdit(row)}>
                        <Edit size={15} />
                      </IconOnlyButton>

                      <IconOnlyButton
                        title="Delete"
                        onClick={() => handleDelete(row.id)}
                        color="#dc2626"
                      >
                        <Trash2 size={15} />
                      </IconOnlyButton>
                    </div>
                  ),
                },
              ]}
              data={filteredReports}
              emptyMessage="No daily reports found"
            />
          </div>
        </Card>
      </div>

      {/* PDF EXPORT TEMPLATE - hidden from screen, used only for PDF */}
      {/* <div id="daily-reports-pdf" style={pdfContainerStyle}>
      <div style={pdfHeaderStyle}>
        <h1 style={{ margin: 0 }}>Daily Site Report</h1>

        <p style={{ margin: '6px 0 0' }}>
          {selectedProject
            ? `${selectedProject.code} - ${selectedProject.name}`
            : 'Selected Project'}
        </p>
      </div>

      {exportReports.map((report) => (
        <div key={report.id} style={pdfReportCardStyle}>
          <h2 style={pdfSectionTitleStyle}>
            Report Date: {formatDate(report.reportDate)}
          </h2>

          <div style={pdfGridStyle}>
            <PdfDetail
              label="Project"
              value={
                report.project
                  ? `${report.project.code} - ${report.project.name}`
                  : selectedProject
                    ? `${selectedProject.code} - ${selectedProject.name}`
                    : '-'
              }
            />

            <PdfDetail label="Prepared By" value={report.preparedBy?.name || '-'} />
            <PdfDetail label="Weather" value={report.weather || '-'} />
            <PdfDetail label="Manpower" value={String(report.manpowerCount ?? 0)} />
          </div>

          <PdfBlock label="Equipment Used" value={report.equipmentUsed} />
          <PdfBlock label="Work Completed" value={report.workCompleted} />
          <PdfBlock label="Material Received" value={report.materialReceived} />
          <PdfBlock label="Issues" value={report.issues} />
          <PdfBlock label="Delays" value={report.delays} />
          <PdfBlock label="Remarks" value={report.remarks} />

          <div style={pdfSignatureStyle}>
            <div>Prepared By: ______________________</div>
            <div>Reviewed By: ______________________</div>
          </div>
        </div>
      ))}
    </div> */}

      {selectedReport && (
        <DailyReportDetailsModal
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
        />
      )}
    </div>
  );
}

const exportOptionsStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '220px 220px',
  gap: 12,
  alignItems: 'end',
  marginBottom: 12,
};

const pdfContainerStyle: React.CSSProperties = {
  position: 'fixed',
  left: 0,
  top: 0,
  width: 794,
  minHeight: 1123,
  background: '#fff',
  color: '#111827',
  padding: 32,
  fontFamily: 'Arial, sans-serif',
  zIndex: -1,
  opacity: 1,
  pointerEvents: 'none',
};

const pdfHeaderStyle: React.CSSProperties = {
  borderBottom: '2px solid #111827',
  paddingBottom: 12,
  marginBottom: 20,
};

const pdfReportCardStyle: React.CSSProperties = {
  pageBreakAfter: 'always',
  border: '1px solid #d1d5db',
  padding: 18,
  marginBottom: 24,
};

const pdfSectionTitleStyle: React.CSSProperties = {
  fontSize: 18,
  margin: '0 0 16px',
};

const pdfGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 12,
  marginBottom: 16,
};

const pdfBlockStyle: React.CSSProperties = {
  borderTop: '1px solid #e5e7eb',
  paddingTop: 10,
  marginTop: 10,
};

const pdfLabelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  color: '#374151',
  marginBottom: 4,
};

const pdfValueStyle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 600,
};

const pdfTextStyle: React.CSSProperties = {
  fontSize: 13,
  lineHeight: 1.5,
  whiteSpace: 'pre-wrap',
};

const pdfSignatureStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 24,
  marginTop: 28,
  fontSize: 13,
};
function DailyReportDetailsModal({ report, onClose }: { report: DailyReport; onClose: () => void }) {
  return (
    <div style={modalOverlayStyle} role="dialog" aria-modal="true">
      <div style={modalStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
          <h2 style={{ margin: 0 }}>Daily Report - {formatDate(report.reportDate)}</h2>
          <Button type="button" variant="secondary" onClick={onClose}>
            <X size={15} /> Close
          </Button>
        </div>

        <div style={detailsGridStyle}>
          <Detail label="Project" value={report.project ? `${report.project.code} - ${report.project.name}` : '-'} />
          <Detail label="Prepared By" value={report.preparedBy?.name || '-'} />
          <Detail label="Weather" value={report.weather || '-'} />
          <Detail label="Manpower" value={String(report.manpowerCount ?? 0)} />
          <Detail label="Equipment Used" value={report.equipmentUsed || '-'} wide />
          <Detail label="Work Completed" value={report.workCompleted || '-'} wide />
          <Detail label="Material Received" value={report.materialReceived || '-'} wide />
          <Detail label="Issues" value={report.issues || '-'} wide />
          <Detail label="Delays" value={report.delays || '-'} wide />
          <Detail label="Remarks" value={report.remarks || '-'} wide />
        </div>
      </div>
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

function IconActionButton({ children, title, onClick }: { children: React.ReactNode; title: string; onClick: () => void }) {
  return (
    <button type="button" title={title} onClick={onClick} style={iconActionButtonStyle}>
      {children}
    </button>
  );
}

function IconOnlyButton({
  children,
  title,
  onClick,
  color,
}: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
  color?: string;
}) {
  return (
    <button type="button" title={title} onClick={onClick} style={{ ...iconOnlyButtonStyle, color: color || '#334155' }}>
      {children}
    </button>
  );
}

function SelectField({ label, value, onChange, children }: { label: string; value: string | number; onChange: (value: string) => void; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>{label}</label>
      <select value={value} onChange={(event) => onChange(event.target.value)} style={fieldStyle}>
        {children}
      </select>
    </div>
  );
}

function TextareaField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>{label}</label>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={3} style={{ ...fieldStyle, resize: 'vertical' }} />
    </div>
  );
}

function Detail({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <div style={{ gridColumn: wide ? '1 / -1' : undefined }}>
      <div style={{ color: '#64748b', fontSize: 13, marginBottom: 4 }}>{label}</div>
      <div style={{ fontWeight: 600, whiteSpace: 'pre-wrap' }}>{value}</div>
    </div>
  );
}
function dateKey(value?: string | null) {
  if (!value) return '';
  return String(value).slice(0, 10);
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
  return value.length > 42 ? `${value.slice(0, 42)}...` : value;
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
  background: '#fff',
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
  cursor: 'pointer',
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
  cursor: 'pointer',
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
