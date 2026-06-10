import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Edit,
  Eye,
  RefreshCcw,
  Save,
  Send,
  Trash2,
  X,
  XCircle,
} from 'lucide-react';
import { financeApi } from '../../api/finance.api';
import type { CashFlowSummary, Invoice, Payment } from '../../api/finance.api';
import { projectsApi } from '../../api/projects.api';
import type { Project } from '../../api/projects.api';
import { Button, Card, DataTable, Input, PageHeader } from '../../components/ui';

type FinanceTab = 'invoice' | 'payment';
type ViewRecord =
  | { type: 'Invoice'; data: Invoice }
  | { type: 'Payment'; data: Payment }
  | null;

const emptyInvoiceForm = {
  projectId: 0,
  code: '',
  title: '',
  description: '',
  invoiceDate: '',
  dueDate: '',
  subtotal: 0,
  taxAmount: 0,
  retentionAmount: 0,
  advanceDeduction: 0,
  status: 'DRAFT',
};

const emptyPaymentForm = {
  projectId: 0,
  invoiceId: '',
  code: '',
  type: 'PROGRESS',
  status: 'PENDING',
  amount: 0,
  paymentDate: '',
  reference: '',
  paidBy: '',
  paidTo: '',
  notes: '',
};

export default function FinancePage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [cashFlow, setCashFlow] = useState<CashFlowSummary | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<number | ''>('');
  const [activeTab, setActiveTab] = useState<FinanceTab>('invoice');
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [viewRecord, setViewRecord] = useState<ViewRecord>(null);
  const [invoiceForm, setInvoiceForm] = useState(emptyInvoiceForm);
  const [paymentForm, setPaymentForm] = useState(emptyPaymentForm);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const filteredInvoices = useMemo(
    () => filterRecords(invoices, search, ['code', 'title', 'status', 'description']),
    [invoices, search],
  );

  const filteredPayments = useMemo(
    () => filterRecords(payments, search, ['code', 'type', 'status', 'reference', 'paidBy', 'paidTo']),
    [payments, search],
  );

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

  async function loadFinance(projectId: number) {
    const [invoiceData, paymentData, cashFlowData] = await Promise.all([
      financeApi.findInvoices(projectId),
      financeApi.findPayments(projectId),
      financeApi.getCashFlow(projectId),
    ]);

    setInvoices(invoiceData);
    setPayments(paymentData);
    setCashFlow(cashFlowData);
  }

  async function handleProjectChange(value: string) {
    const projectId = Number(value);
    setSelectedProjectId(projectId || '');
    setInvoiceForm((prev) => ({ ...prev, projectId }));
    setPaymentForm((prev) => ({ ...prev, projectId, invoiceId: '' }));

    if (!projectId) return;

    try {
      setLoading(true);
      setMessage('');
      await loadFinance(projectId);
    } catch (error: any) {
      setMessage(getErrorMessage(error, 'Failed to load finance data'));
    } finally {
      setLoading(false);
    }
  }

  function resetForms() {
    setEditingInvoice(null);
    setEditingPayment(null);
    setInvoiceForm({ ...emptyInvoiceForm, projectId: Number(selectedProjectId || 0) });
    setPaymentForm({ ...emptyPaymentForm, projectId: Number(selectedProjectId || 0) });
  }

  async function runAction(action: () => Promise<any>, success: string, fallback: string) {
    try {
      setLoading(true);
      setMessage('');
      await action();
      setMessage(success);
      if (selectedProjectId) await loadFinance(Number(selectedProjectId));
    } catch (error: any) {
      setMessage(getErrorMessage(error, fallback));
    } finally {
      setLoading(false);
    }
  }

  async function saveInvoice(e: React.FormEvent) {
    e.preventDefault();

    const payload = {
      ...invoiceForm,
      projectId: Number(invoiceForm.projectId),
      subtotal: Number(invoiceForm.subtotal),
      taxAmount: Number(invoiceForm.taxAmount),
      retentionAmount: Number(invoiceForm.retentionAmount),
      advanceDeduction: Number(invoiceForm.advanceDeduction),
      dueDate: invoiceForm.dueDate || undefined,
    };

    await runAction(
      async () => {
        if (editingInvoice) await financeApi.updateInvoice(editingInvoice.id, payload);
        else await financeApi.createInvoice(payload);
        resetForms();
      },
      editingInvoice ? 'Invoice updated successfully' : 'Invoice created successfully',
      editingInvoice ? 'Failed to update invoice' : 'Failed to create invoice',
    );
  }

  async function savePayment(e: React.FormEvent) {
    e.preventDefault();

    const payload = {
      ...paymentForm,
      projectId: Number(paymentForm.projectId),
      invoiceId: paymentForm.invoiceId ? Number(paymentForm.invoiceId) : undefined,
      amount: Number(paymentForm.amount),
      paymentDate: paymentForm.paymentDate || undefined,
    };

    await runAction(
      async () => {
        if (editingPayment) await financeApi.updatePayment(editingPayment.id, payload);
        else await financeApi.createPayment(payload);
        resetForms();
      },
      editingPayment ? 'Payment updated successfully' : 'Payment created successfully',
      editingPayment ? 'Failed to update payment' : 'Failed to create payment',
    );
  }

  function editInvoice(row: Invoice) {
    setActiveTab('invoice');
    setEditingInvoice(row);
    setInvoiceForm({
      projectId: row.projectId,
      code: row.code,
      title: row.title,
      description: row.description || '',
      invoiceDate: toDateInput(row.invoiceDate),
      dueDate: toDateInput(row.dueDate),
      subtotal: Number(row.subtotal),
      taxAmount: Number(row.taxAmount),
      retentionAmount: Number(row.retentionAmount),
      advanceDeduction: Number(row.advanceDeduction),
      status: row.status || 'DRAFT',
    });
  }

  function editPayment(row: Payment) {
    setActiveTab('payment');
    setEditingPayment(row);
    setPaymentForm({
      projectId: row.projectId,
      invoiceId: row.invoiceId ? String(row.invoiceId) : '',
      code: row.code,
      type: row.type || 'PROGRESS',
      status: row.status || 'PENDING',
      amount: Number(row.amount),
      paymentDate: toDateInput(row.paymentDate),
      reference: row.reference || '',
      paidBy: row.paidBy || '',
      paidTo: row.paidTo || '',
      notes: row.notes || '',
    });
  }

  return (
    <div>
      <PageHeader title="Finance" description="Manage invoices, payments, retention, advances, and cash flow." />

      <SelectField label="Project" value={selectedProjectId} onChange={handleProjectChange}>
        <option value="">Select project</option>
        {projects.map((project) => (
          <option key={project.id} value={project.id}>{project.code} - {project.name}</option>
        ))}
      </SelectField>

      {message && <Alert type={isSuccess ? 'success' : 'error'}>{message}</Alert>}

      {cashFlow && (
        <div style={summaryGridStyle}>
          <SummaryCard title="Invoiced" value={cashFlow.invoicedAmount} />
          <SummaryCard title="Received" value={cashFlow.receivedAmount} />
          <SummaryCard title="Expenses" value={cashFlow.expenseAmount} />
          <SummaryCard title="Retention Held" value={cashFlow.retentionHeld} />
          <SummaryCard title="Advance Deducted" value={cashFlow.advanceDeducted} />
          <SummaryCard title="Net Cash Flow" value={cashFlow.netCashFlow} />
          <SummaryCard title="Outstanding" value={cashFlow.outstandingReceivable} />
        </div>
      )}

      <div style={actionBarStyle}>
        <IconActionButton title="Refresh" onClick={() => selectedProjectId && runAction(() => loadFinance(Number(selectedProjectId)), 'Finance data refreshed successfully', 'Failed to refresh finance data')}>
          <RefreshCcw size={16} /> Refresh
        </IconActionButton>
      </div>

      <div className="module-grid">
        <div className="module-sidebar">
          <Card title="Finance Forms">
            <div style={tabStyle}>
              <TabButton active={activeTab === 'invoice'} onClick={() => setActiveTab('invoice')}>Invoice</TabButton>
              <TabButton active={activeTab === 'payment'} onClick={() => setActiveTab('payment')}>Payment</TabButton>
            </div>

            {activeTab === 'invoice' && (
              <form onSubmit={saveInvoice}>
                <Input label="Invoice Code" value={invoiceForm.code} onChange={(e) => setInvoiceForm({ ...invoiceForm, code: e.target.value })} required />
                <Input label="Title" value={invoiceForm.title} onChange={(e) => setInvoiceForm({ ...invoiceForm, title: e.target.value })} required />
                <TextareaField label="Description" value={invoiceForm.description} onChange={(value) => setInvoiceForm({ ...invoiceForm, description: value })} />
                <Input label="Invoice Date" type="date" value={invoiceForm.invoiceDate} onChange={(e) => setInvoiceForm({ ...invoiceForm, invoiceDate: e.target.value })} required />
                <Input label="Due Date" type="date" value={invoiceForm.dueDate} onChange={(e) => setInvoiceForm({ ...invoiceForm, dueDate: e.target.value })} />
                <Input label="Subtotal" type="number" value={invoiceForm.subtotal} onChange={(e) => setInvoiceForm({ ...invoiceForm, subtotal: Number(e.target.value) })} />
                <Input label="Tax Amount" type="number" value={invoiceForm.taxAmount} onChange={(e) => setInvoiceForm({ ...invoiceForm, taxAmount: Number(e.target.value) })} />
                <Input label="Retention Amount" type="number" value={invoiceForm.retentionAmount} onChange={(e) => setInvoiceForm({ ...invoiceForm, retentionAmount: Number(e.target.value) })} />
                <Input label="Advance Deduction" type="number" value={invoiceForm.advanceDeduction} onChange={(e) => setInvoiceForm({ ...invoiceForm, advanceDeduction: Number(e.target.value) })} />
                <SelectField label="Status" value={invoiceForm.status} onChange={(value) => setInvoiceForm({ ...invoiceForm, status: value })}>
                  <option value="DRAFT">Draft</option>
                  <option value="SENT">Sent</option>
                  <option value="PARTIALLY_PAID">Partially Paid</option>
                  <option value="PAID">Paid</option>
                  <option value="CANCELLED">Cancelled</option>
                </SelectField>
                <FormButtons loading={loading} editing={Boolean(editingInvoice)} onCancel={resetForms} label="Invoice" />
              </form>
            )}

            {activeTab === 'payment' && (
              <form onSubmit={savePayment}>
                <SelectField label="Invoice" value={paymentForm.invoiceId} onChange={(value) => setPaymentForm({ ...paymentForm, invoiceId: value })}>
                  <option value="">No invoice</option>
                  {invoices.map((invoice) => (
                    <option key={invoice.id} value={invoice.id}>{invoice.code} - {invoice.title}</option>
                  ))}
                </SelectField>
                <Input label="Payment Code" value={paymentForm.code} onChange={(e) => setPaymentForm({ ...paymentForm, code: e.target.value })} required />
                <SelectField label="Type" value={paymentForm.type} onChange={(value) => setPaymentForm({ ...paymentForm, type: value })}>
                  <option value="ADVANCE">Advance</option>
                  <option value="PROGRESS">Progress</option>
                  <option value="RETENTION">Retention</option>
                  <option value="FINAL">Final</option>
                  <option value="OTHER">Other</option>
                </SelectField>
                <SelectField label="Status" value={paymentForm.status} onChange={(value) => setPaymentForm({ ...paymentForm, status: value })}>
                  <option value="PENDING">Pending</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="FAILED">Failed</option>
                  <option value="CANCELLED">Cancelled</option>
                </SelectField>
                <Input label="Amount" type="number" value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: Number(e.target.value) })} />
                <Input label="Payment Date" type="date" value={paymentForm.paymentDate} onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })} />
                <Input label="Reference" value={paymentForm.reference} onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })} />
                <Input label="Paid By" value={paymentForm.paidBy} onChange={(e) => setPaymentForm({ ...paymentForm, paidBy: e.target.value })} />
                <Input label="Paid To" value={paymentForm.paidTo} onChange={(e) => setPaymentForm({ ...paymentForm, paidTo: e.target.value })} />
                <TextareaField label="Notes" value={paymentForm.notes} onChange={(value) => setPaymentForm({ ...paymentForm, notes: value })} />
                <FormButtons loading={loading} editing={Boolean(editingPayment)} onCancel={resetForms} label="Payment" />
              </form>
            )}
          </Card>
        </div>

        <div style={{ display: 'grid', gap: 20 }}>
          <Card title="Finance Register">
            <Input label="Search" placeholder="Search invoices, payments, status, reference..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </Card>

          <Card title="Invoices">
            <DataTable<Invoice>
              columns={[
                { header: 'Code', accessor: 'code' },
                { header: 'Title', accessor: 'title' },
                { header: 'Status', accessor: (row) => <StatusBadge status={row.status} /> },
                { header: 'Invoice Date', accessor: (row) => formatDate(row.invoiceDate) },
                { header: 'Due Date', accessor: (row) => formatDate(row.dueDate) },
                { header: 'Total', accessor: (row) => money(row.totalAmount) },
                { header: 'Payments', accessor: (row) => row.payments?.length ?? 0 },
                {
                  header: 'Actions',
                  accessor: (row) => (
                    <Actions
                      onView={() => setViewRecord({ type: 'Invoice', data: row })}
                      onEdit={() => editInvoice(row)}
                      onDelete={() => runAction(() => financeApi.removeInvoice(row.id), 'Invoice deleted successfully', 'Failed to delete invoice')}
                      extra={row.status === 'DRAFT' ? (
                        <IconOnlyButton title="Send" color="#2563eb" onClick={() => runAction(() => financeApi.sendInvoice(row.id), 'Invoice sent successfully', 'Failed to send invoice')}><Send size={15} /></IconOnlyButton>
                      ) : row.status !== 'PAID' && row.status !== 'CANCELLED' ? (
                        <IconOnlyButton title="Cancel" color="#dc2626" onClick={() => runAction(() => financeApi.cancelInvoice(row.id), 'Invoice cancelled successfully', 'Failed to cancel invoice')}><XCircle size={15} /></IconOnlyButton>
                      ) : null}
                    />
                  ),
                },
              ]}
              data={filteredInvoices}
              emptyMessage="No invoices found"
            />
          </Card>

          <Card title="Payments">
            <DataTable<Payment>
              columns={[
                { header: 'Code', accessor: 'code' },
                { header: 'Type', accessor: (row) => <StatusBadge status={row.type} /> },
                { header: 'Status', accessor: (row) => <StatusBadge status={row.status} /> },
                { header: 'Amount', accessor: (row) => money(row.amount) },
                { header: 'Payment Date', accessor: (row) => formatDate(row.paymentDate) },
                { header: 'Invoice', accessor: (row) => row.invoice?.code || '-' },
                { header: 'Reference', accessor: (row) => row.reference || '-' },
                {
                  header: 'Actions',
                  accessor: (row) => (
                    <Actions
                      onView={() => setViewRecord({ type: 'Payment', data: row })}
                      onEdit={() => editPayment(row)}
                      onDelete={() => runAction(() => financeApi.removePayment(row.id), 'Payment deleted successfully', 'Failed to delete payment')}
                      extra={row.status === 'PENDING' ? (
                        <>
                          <IconOnlyButton title="Complete" color="#16a34a" onClick={() => runAction(() => financeApi.completePayment(row.id), 'Payment completed successfully', 'Failed to complete payment')}><CheckCircle2 size={15} /></IconOnlyButton>
                          <IconOnlyButton title="Cancel" color="#dc2626" onClick={() => runAction(() => financeApi.cancelPayment(row.id), 'Payment cancelled successfully', 'Failed to cancel payment')}><XCircle size={15} /></IconOnlyButton>
                        </>
                      ) : null}
                    />
                  ),
                },
              ]}
              data={filteredPayments}
              emptyMessage="No payments found"
            />
          </Card>
        </div>
      </div>

      {viewRecord && <DetailsModal record={viewRecord} onClose={() => setViewRecord(null)} />}
    </div>
  );
}

function Actions({ onView, onEdit, onDelete, extra }: { onView: () => void; onEdit: () => void; onDelete: () => void; extra?: React.ReactNode }) {
  return <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}><IconOnlyButton title="View" onClick={onView}><Eye size={15} /></IconOnlyButton><IconOnlyButton title="Edit" onClick={onEdit}><Edit size={15} /></IconOnlyButton>{extra}<IconOnlyButton title="Delete" onClick={onDelete} color="#dc2626"><Trash2 size={15} /></IconOnlyButton></div>;
}

function FormButtons({ loading, editing, onCancel, label }: { loading: boolean; editing: boolean; onCancel: () => void; label: string }) {
  return <div style={{ display: 'flex', gap: 8 }}><Button disabled={loading} style={{ flex: 1 }}>{loading ? 'Saving...' : editing ? <><Save size={15} /> Save Changes</> : `Create ${label}`}</Button>{editing && <Button type="button" variant="secondary" onClick={onCancel}><X size={15} /> Cancel</Button>}</div>;
}

function DetailsModal({ record, onClose }: { record: Exclude<ViewRecord, null>; onClose: () => void }) {
  const data: any = record.data;
  return <div style={modalOverlayStyle} role="dialog" aria-modal="true"><div style={modalStyle}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}><h2 style={{ margin: 0 }}>{record.type}: {data.code}</h2><Button type="button" variant="secondary" onClick={onClose}><X size={15} /> Close</Button></div><div style={detailsGridStyle}><Detail label="Code" value={data.code || '-'} /><Detail label="Title / Invoice" value={data.title || data.invoice?.code || '-'} /><Detail label="Status" value={data.status || '-'} /><Detail label="Type" value={data.type || '-'} /><Detail label="Amount / Total" value={money(data.amount || data.totalAmount)} /><Detail label="Date" value={formatDate(data.invoiceDate || data.paymentDate || data.createdAt)} /><Detail label="Reference" value={data.reference || '-'} /><Detail label="Description / Notes" value={data.description || data.notes || '-'} wide /></div></div></div>;
}

function SummaryCard({ title, value }: { title: string; value: number | string }) {
  return <Card><p style={{ margin: 0, color: '#6b7280', fontSize: 13 }}>{title}</p><h3 style={{ margin: '8px 0 0' }}>{typeof value === 'number' ? money(value) : value}</h3></Card>;
}

function Alert({ type, children }: { type: 'success' | 'error'; children: React.ReactNode }) {
  const success = type === 'success';
  return <div style={{ marginBottom: 16, padding: 12, borderRadius: 8, fontWeight: 600, background: success ? '#dcfce7' : '#fee2e2', color: success ? '#166534' : '#991b1b', border: success ? '1px solid #86efac' : '1px solid #fca5a5' }}>{children}</div>;
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} style={tabButtonStyle(active)}>{children}</button>;
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
  return <div style={{ marginBottom: 12 }}><label style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>{label}</label><textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3} style={{ ...fieldStyle, resize: 'vertical' }} /></div>;
}

function Detail({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return <div style={{ gridColumn: wide ? '1 / -1' : undefined }}><div style={{ color: '#64748b', fontSize: 13, marginBottom: 4 }}>{label}</div><div style={{ fontWeight: 600, whiteSpace: 'pre-wrap' }}>{value}</div></div>;
}

function money(value?: string | number | null) {
  if (value === null || value === undefined || value === '') return '-';
  return Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString();
}

function toDateInput(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

function filterRecords<T extends Record<string, any>>(records: T[], keyword: string, fields: string[]) {
  const query = keyword.trim().toLowerCase();
  if (!query) return records;
  return records.filter((record) => fields.some((field) => String(record[field] || '').toLowerCase().includes(query)));
}

function getErrorMessage(error: any, fallback: string) {
  return error?.response?.data?.message || error?.message || fallback;
}

const summaryGridStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 16, marginBottom: 20 };
const actionBarStyle: React.CSSProperties = { display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 16 };
const tabStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 16 };
const fieldStyle: React.CSSProperties = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff' };
const iconActionButtonStyle: React.CSSProperties = { minHeight: 38, padding: '8px 12px', borderRadius: 10, border: '1px solid #dbe3ef', background: '#fff', color: '#1e293b', display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontWeight: 700 };
const iconOnlyButtonStyle: React.CSSProperties = { width: 32, height: 32, borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' };
const modalOverlayStyle: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24 };
const modalStyle: React.CSSProperties = { width: 'min(820px, 100%)', maxHeight: '90vh', overflowY: 'auto', background: '#fff', borderRadius: 14, padding: 24, boxShadow: '0 20px 40px rgba(15, 23, 42, 0.25)' };
const detailsGridStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16, marginTop: 20 };

function tabButtonStyle(active: boolean): React.CSSProperties {
  return { padding: '9px 10px', borderRadius: 8, border: '1px solid #dbe3ef', background: active ? '#2563eb' : '#fff', color: active ? '#fff' : '#1e293b', cursor: 'pointer', fontWeight: 700 };
}

function badgeStyle(status: string): React.CSSProperties {
  const base: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', borderRadius: 999, padding: '4px 10px', fontSize: 12, fontWeight: 700 };
  switch (status) {
    case 'PAID':
    case 'COMPLETED':
      return { ...base, background: '#dcfce7', color: '#166534' };
    case 'SENT':
    case 'PARTIALLY_PAID':
    case 'PROGRESS':
      return { ...base, background: '#dbeafe', color: '#1d4ed8' };
    case 'PENDING':
    case 'DRAFT':
      return { ...base, background: '#fef9c3', color: '#854d0e' };
    case 'FAILED':
    case 'CANCELLED':
      return { ...base, background: '#fee2e2', color: '#991b1b' };
    default:
      return { ...base, background: '#f1f5f9', color: '#475569' };
  }
}