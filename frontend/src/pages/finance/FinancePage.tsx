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
  const [pageLoading, setPageLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState('');

  const filteredInvoices = useMemo(
    () =>
      filterRecords(invoices, search, ['code', 'title', 'status', 'description']),
    [invoices, search],
  );

  const filteredPayments = useMemo(
    () =>
      filterRecords(payments, search, [
        'code',
        'type',
        'status',
        'reference',
        'paidBy',
        'paidTo',
      ]),
    [payments, search],
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
        setInvoiceForm({ ...emptyInvoiceForm, projectId: firstProjectId });
        setPaymentForm({
          ...emptyPaymentForm,
          projectId: firstProjectId,
          invoiceId: '',
        });

        await loadFinance(firstProjectId);
      } else {
        setSelectedProjectId('');
        clearFinanceData();
      }
    } catch (error: any) {
      setMessage(getErrorMessage(error, 'Failed to load finance data'));
    } finally {
      setPageLoading(false);
    }
  }

  function clearFinanceData() {
    setInvoices([]);
    setPayments([]);
    setCashFlow(null);
  }

  async function loadFinance(projectId: number) {
    if (!projectId) {
      clearFinanceData();
      return;
    }

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
    try {
      setActionLoading(true);
      setMessage('');

      const projectId = Number(value);

      setSelectedProjectId(projectId || '');
      setEditingInvoice(null);
      setEditingPayment(null);

      setInvoiceForm({ ...emptyInvoiceForm, projectId });
      setPaymentForm({ ...emptyPaymentForm, projectId, invoiceId: '' });

      if (projectId) {
        await loadFinance(projectId);
      } else {
        clearFinanceData();
      }
    } catch (error: any) {
      setMessage(getErrorMessage(error, 'Failed to load finance data'));
    } finally {
      setActionLoading(false);
    }
  }

  function resetForms() {
    setEditingInvoice(null);
    setEditingPayment(null);

    setInvoiceForm({
      ...emptyInvoiceForm,
      projectId: Number(selectedProjectId || 0),
    });

    setPaymentForm({
      ...emptyPaymentForm,
      projectId: Number(selectedProjectId || 0),
      invoiceId: '',
    });

    setMessage('');
  }

  async function runAction(
    action: () => Promise<any>,
    success: string,
    fallback: string,
  ) {
    try {
      setActionLoading(true);
      setMessage('');

      await action();
      setMessage(success);

      if (selectedProjectId) {
        await loadFinance(Number(selectedProjectId));
      }
    } catch (error: any) {
      setMessage(getErrorMessage(error, fallback));
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRefresh() {
    if (!selectedProjectId) return;

    await runAction(
      () => loadFinance(Number(selectedProjectId)),
      'Finance data refreshed successfully',
      'Failed to refresh finance data',
    );
  }

  async function saveInvoice(e: React.FormEvent) {
    e.preventDefault();

    if (!invoiceForm.projectId) return setMessage('Project is required');
    if (!invoiceForm.code.trim()) return setMessage('Invoice code is required');
    if (!invoiceForm.title.trim()) return setMessage('Invoice title is required');
    if (!invoiceForm.invoiceDate) return setMessage('Invoice date is required');

    const payload = {
      ...invoiceForm,
      projectId: Number(invoiceForm.projectId),
      code: invoiceForm.code.trim().toUpperCase(),
      title: invoiceForm.title.trim(),
      description: invoiceForm.description.trim(),
      subtotal: Number(invoiceForm.subtotal),
      taxAmount: Number(invoiceForm.taxAmount),
      retentionAmount: Number(invoiceForm.retentionAmount),
      advanceDeduction: Number(invoiceForm.advanceDeduction),
      dueDate: invoiceForm.dueDate || undefined,
    };

    await runAction(
      async () => {
        if (editingInvoice) {
          await financeApi.updateInvoice(editingInvoice.id, payload);
        } else {
          await financeApi.createInvoice(payload);
        }

        resetForms();
      },
      editingInvoice
        ? 'Invoice updated successfully'
        : 'Invoice created successfully',
      editingInvoice ? 'Failed to update invoice' : 'Failed to create invoice',
    );
  }

  async function savePayment(e: React.FormEvent) {
    e.preventDefault();

    if (!paymentForm.projectId) return setMessage('Project is required');
    if (!paymentForm.code.trim()) return setMessage('Payment code is required');
    if (Number(paymentForm.amount) <= 0) {
      return setMessage('Amount must be greater than zero');
    }

    const payload = {
      ...paymentForm,
      projectId: Number(paymentForm.projectId),
      invoiceId: paymentForm.invoiceId
        ? Number(paymentForm.invoiceId)
        : undefined,
      code: paymentForm.code.trim().toUpperCase(),
      amount: Number(paymentForm.amount),
      reference: paymentForm.reference.trim(),
      paidBy: paymentForm.paidBy.trim(),
      paidTo: paymentForm.paidTo.trim(),
      notes: paymentForm.notes.trim(),
      paymentDate: paymentForm.paymentDate || undefined,
    };

    await runAction(
      async () => {
        if (editingPayment) {
          await financeApi.updatePayment(editingPayment.id, payload);
        } else {
          await financeApi.createPayment(payload);
        }

        resetForms();
      },
      editingPayment
        ? 'Payment updated successfully'
        : 'Payment created successfully',
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

    setMessage('');
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

    setMessage('');
  }

  return (
    <div>
      <PageHeader
        title="Finance"
        description="Manage invoices, payments, retention, advances, and cash flow."
      />

      {message && <Alert type={isSuccess ? 'success' : 'error'}>{message}</Alert>}

      {pageLoading ? (
        <FinanceLoading />
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

          {cashFlow && (
            <div style={summaryGridStyle}>
              <SummaryCard title="Invoiced" value={cashFlow.invoicedAmount} />
              <SummaryCard title="Received" value={cashFlow.receivedAmount} />
              <SummaryCard title="Expenses" value={cashFlow.expenseAmount} />
              <SummaryCard title="Retention Held" value={cashFlow.retentionHeld} />
              <SummaryCard
                title="Advance Deducted"
                value={cashFlow.advanceDeducted}
              />
              <SummaryCard title="Net Cash Flow" value={cashFlow.netCashFlow} />
              <SummaryCard
                title="Outstanding"
                value={cashFlow.outstandingReceivable}
              />
            </div>
          )}

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
              <Card title="Finance Forms">
                <div style={tabStyle}>
                  <TabButton
                    active={activeTab === 'invoice'}
                    disabled={actionLoading}
                    onClick={() => setActiveTab('invoice')}
                  >
                    Invoice
                  </TabButton>

                  <TabButton
                    active={activeTab === 'payment'}
                    disabled={actionLoading}
                    onClick={() => setActiveTab('payment')}
                  >
                    Payment
                  </TabButton>
                </div>

                {activeTab === 'invoice' && (
                  <form onSubmit={saveInvoice} aria-busy={actionLoading}>
                    <Input
                      label="Invoice Code"
                      value={invoiceForm.code}
                      onChange={(e) =>
                        setInvoiceForm({
                          ...invoiceForm,
                          code: e.target.value,
                        })
                      }
                      required
                    />

                    <Input
                      label="Title"
                      value={invoiceForm.title}
                      onChange={(e) =>
                        setInvoiceForm({
                          ...invoiceForm,
                          title: e.target.value,
                        })
                      }
                      required
                    />

                    <TextareaField
                      label="Description"
                      value={invoiceForm.description}
                      disabled={actionLoading}
                      onChange={(value) =>
                        setInvoiceForm({
                          ...invoiceForm,
                          description: value,
                        })
                      }
                    />

                    <Input
                      label="Invoice Date"
                      type="date"
                      value={invoiceForm.invoiceDate}
                      onChange={(e) =>
                        setInvoiceForm({
                          ...invoiceForm,
                          invoiceDate: e.target.value,
                        })
                      }
                      required
                    />

                    <Input
                      label="Due Date"
                      type="date"
                      value={invoiceForm.dueDate}
                      onChange={(e) =>
                        setInvoiceForm({
                          ...invoiceForm,
                          dueDate: e.target.value,
                        })
                      }
                    />

                    <Input
                      label="Subtotal"
                      type="number"
                      value={invoiceForm.subtotal}
                      onChange={(e) =>
                        setInvoiceForm({
                          ...invoiceForm,
                          subtotal: Number(e.target.value),
                        })
                      }
                    />

                    <Input
                      label="Tax Amount"
                      type="number"
                      value={invoiceForm.taxAmount}
                      onChange={(e) =>
                        setInvoiceForm({
                          ...invoiceForm,
                          taxAmount: Number(e.target.value),
                        })
                      }
                    />

                    <Input
                      label="Retention Amount"
                      type="number"
                      value={invoiceForm.retentionAmount}
                      onChange={(e) =>
                        setInvoiceForm({
                          ...invoiceForm,
                          retentionAmount: Number(e.target.value),
                        })
                      }
                    />

                    <Input
                      label="Advance Deduction"
                      type="number"
                      value={invoiceForm.advanceDeduction}
                      onChange={(e) =>
                        setInvoiceForm({
                          ...invoiceForm,
                          advanceDeduction: Number(e.target.value),
                        })
                      }
                    />

                    <SelectField
                      label="Status"
                      value={invoiceForm.status}
                      disabled={actionLoading}
                      onChange={(value) =>
                        setInvoiceForm({
                          ...invoiceForm,
                          status: value,
                        })
                      }
                    >
                      <option value="DRAFT">Draft</option>
                      <option value="SENT">Sent</option>
                      <option value="PARTIALLY_PAID">Partially Paid</option>
                      <option value="PAID">Paid</option>
                      <option value="CANCELLED">Cancelled</option>
                    </SelectField>

                    <FormButtons
                      loading={actionLoading}
                      editing={Boolean(editingInvoice)}
                      onCancel={resetForms}
                      label="Invoice"
                    />
                  </form>
                )}

                {activeTab === 'payment' && (
                  <form onSubmit={savePayment} aria-busy={actionLoading}>
                    <SelectField
                      label="Invoice"
                      value={paymentForm.invoiceId}
                      disabled={actionLoading}
                      onChange={(value) =>
                        setPaymentForm({
                          ...paymentForm,
                          invoiceId: value,
                        })
                      }
                    >
                      <option value="">No invoice</option>

                      {invoices.map((invoice) => (
                        <option key={invoice.id} value={invoice.id}>
                          {invoice.code} - {invoice.title}
                        </option>
                      ))}
                    </SelectField>

                    <Input
                      label="Payment Code"
                      value={paymentForm.code}
                      onChange={(e) =>
                        setPaymentForm({
                          ...paymentForm,
                          code: e.target.value,
                        })
                      }
                      required
                    />

                    <SelectField
                      label="Type"
                      value={paymentForm.type}
                      disabled={actionLoading}
                      onChange={(value) =>
                        setPaymentForm({
                          ...paymentForm,
                          type: value,
                        })
                      }
                    >
                      <option value="ADVANCE">Advance</option>
                      <option value="PROGRESS">Progress</option>
                      <option value="RETENTION">Retention</option>
                      <option value="FINAL">Final</option>
                      <option value="OTHER">Other</option>
                    </SelectField>

                    <SelectField
                      label="Status"
                      value={paymentForm.status}
                      disabled={actionLoading}
                      onChange={(value) =>
                        setPaymentForm({
                          ...paymentForm,
                          status: value,
                        })
                      }
                    >
                      <option value="PENDING">Pending</option>
                      <option value="COMPLETED">Completed</option>
                      <option value="FAILED">Failed</option>
                      <option value="CANCELLED">Cancelled</option>
                    </SelectField>

                    <Input
                      label="Amount"
                      type="number"
                      value={paymentForm.amount}
                      onChange={(e) =>
                        setPaymentForm({
                          ...paymentForm,
                          amount: Number(e.target.value),
                        })
                      }
                    />

                    <Input
                      label="Payment Date"
                      type="date"
                      value={paymentForm.paymentDate}
                      onChange={(e) =>
                        setPaymentForm({
                          ...paymentForm,
                          paymentDate: e.target.value,
                        })
                      }
                    />

                    <Input
                      label="Reference"
                      value={paymentForm.reference}
                      onChange={(e) =>
                        setPaymentForm({
                          ...paymentForm,
                          reference: e.target.value,
                        })
                      }
                    />

                    <Input
                      label="Paid By"
                      value={paymentForm.paidBy}
                      onChange={(e) =>
                        setPaymentForm({
                          ...paymentForm,
                          paidBy: e.target.value,
                        })
                      }
                    />

                    <Input
                      label="Paid To"
                      value={paymentForm.paidTo}
                      onChange={(e) =>
                        setPaymentForm({
                          ...paymentForm,
                          paidTo: e.target.value,
                        })
                      }
                    />

                    <TextareaField
                      label="Notes"
                      value={paymentForm.notes}
                      disabled={actionLoading}
                      onChange={(value) =>
                        setPaymentForm({
                          ...paymentForm,
                          notes: value,
                        })
                      }
                    />

                    <FormButtons
                      loading={actionLoading}
                      editing={Boolean(editingPayment)}
                      onCancel={resetForms}
                      label="Payment"
                    />
                  </form>
                )}
              </Card>
            </div>

            <div style={{ display: 'grid', gap: 20 }}>
              <Card title="Finance Register">
                <Input
                  label="Search"
                  placeholder="Search invoices, payments, status, reference..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </Card>

              <Card title="Invoices">
                <DataTable<Invoice>
                  columns={[
                    { header: 'Code', accessor: 'code' },
                    { header: 'Title', accessor: 'title' },
                    {
                      header: 'Status',
                      accessor: (row) => <StatusBadge status={row.status} />,
                    },
                    {
                      header: 'Invoice Date',
                      accessor: (row) => formatDate(row.invoiceDate),
                    },
                    {
                      header: 'Due Date',
                      accessor: (row) => formatDate(row.dueDate),
                    },
                    {
                      header: 'Total',
                      accessor: (row) => money(row.totalAmount),
                    },
                    {
                      header: 'Payments',
                      accessor: (row) => row.payments?.length ?? 0,
                    },
                    {
                      header: 'Actions',
                      accessor: (row) => (
                        <Actions
                          loading={actionLoading}
                          onView={() =>
                            setViewRecord({
                              type: 'Invoice',
                              data: row,
                            })
                          }
                          onEdit={() => editInvoice(row)}
                          onDelete={() =>
                            runAction(
                              () => financeApi.removeInvoice(row.id),
                              'Invoice deleted successfully',
                              'Failed to delete invoice',
                            )
                          }
                          extra={
                            row.status === 'DRAFT' ? (
                              <IconOnlyButton
                                title="Send"
                                color="#2563eb"
                                disabled={actionLoading}
                                onClick={() =>
                                  runAction(
                                    () => financeApi.sendInvoice(row.id),
                                    'Invoice sent successfully',
                                    'Failed to send invoice',
                                  )
                                }
                              >
                                <Send size={15} />
                              </IconOnlyButton>
                            ) : row.status !== 'PAID' &&
                              row.status !== 'CANCELLED' ? (
                              <IconOnlyButton
                                title="Cancel"
                                color="#dc2626"
                                disabled={actionLoading}
                                onClick={() =>
                                  runAction(
                                    () => financeApi.cancelInvoice(row.id),
                                    'Invoice cancelled successfully',
                                    'Failed to cancel invoice',
                                  )
                                }
                              >
                                <XCircle size={15} />
                              </IconOnlyButton>
                            ) : null
                          }
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
                    {
                      header: 'Type',
                      accessor: (row) => <StatusBadge status={row.type} />,
                    },
                    {
                      header: 'Status',
                      accessor: (row) => <StatusBadge status={row.status} />,
                    },
                    {
                      header: 'Amount',
                      accessor: (row) => money(row.amount),
                    },
                    {
                      header: 'Payment Date',
                      accessor: (row) => formatDate(row.paymentDate),
                    },
                    {
                      header: 'Invoice',
                      accessor: (row) => row.invoice?.code || '-',
                    },
                    {
                      header: 'Reference',
                      accessor: (row) => row.reference || '-',
                    },
                    {
                      header: 'Actions',
                      accessor: (row) => (
                        <Actions
                          loading={actionLoading}
                          onView={() =>
                            setViewRecord({
                              type: 'Payment',
                              data: row,
                            })
                          }
                          onEdit={() => editPayment(row)}
                          onDelete={() =>
                            runAction(
                              () => financeApi.removePayment(row.id),
                              'Payment deleted successfully',
                              'Failed to delete payment',
                            )
                          }
                          extra={
                            row.status === 'PENDING' ? (
                              <>
                                <IconOnlyButton
                                  title="Complete"
                                  color="#16a34a"
                                  disabled={actionLoading}
                                  onClick={() =>
                                    runAction(
                                      () => financeApi.completePayment(row.id),
                                      'Payment completed successfully',
                                      'Failed to complete payment',
                                    )
                                  }
                                >
                                  <CheckCircle2 size={15} />
                                </IconOnlyButton>

                                <IconOnlyButton
                                  title="Cancel"
                                  color="#dc2626"
                                  disabled={actionLoading}
                                  onClick={() =>
                                    runAction(
                                      () => financeApi.cancelPayment(row.id),
                                      'Payment cancelled successfully',
                                      'Failed to cancel payment',
                                    )
                                  }
                                >
                                  <XCircle size={15} />
                                </IconOnlyButton>
                              </>
                            ) : null
                          }
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
        </>
      )}

      {viewRecord && (
        <DetailsModal
          record={viewRecord}
          onClose={() => setViewRecord(null)}
          actionLoading={actionLoading}
        />
      )}
    </div>
  );
}

function FinanceLoading() {
  return (
    <div role="status" aria-live="polite" aria-busy="true">
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <span
            style={{
              width: 24,
              height: 24,
              border: '3px solid #e5e7eb',
              borderTopColor: '#2563eb',
              borderRadius: '50%',
              display: 'inline-block',
              animation: 'finance-spin 0.8s linear infinite',
            }}
          />

          <div>
            <strong style={{ color: '#111827' }}>Loading finance records</strong>
            <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: 14 }}>
              Retrieving invoices, payments, cash flow, retention, advances, and
              outstanding balances from the server. Please wait.
            </p>
          </div>
        </div>

        <Skeleton width="260px" height={38} marginTop={8} />

        <div style={summaryGridStyle}>
          {Array.from({ length: 7 }).map((_, index) => (
            <div key={index} style={summarySkeletonCardStyle}>
              <Skeleton width="60%" height={13} />
              <Skeleton width="45%" height={28} marginTop={12} />
            </div>
          ))}
        </div>

        <div style={actionBarStyle}>
          <Skeleton width="110px" height={38} />
        </div>

        <div className="module-grid">
          <div className="module-sidebar">
            <div style={loadingPanelStyle}>
              <Skeleton width="170px" height={18} />

              {Array.from({ length: 10 }).map((_, index) => (
                <Skeleton key={index} width="100%" height={36} marginTop={18} />
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gap: 20 }}>
            {Array.from({ length: 3 }).map((_, cardIndex) => (
              <div
                key={cardIndex}
                style={{
                  minHeight: cardIndex === 0 ? 120 : 280,
                  padding: 18,
                  borderRadius: 14,
                  background: '#ffffff',
                  border: '1px solid #e5e7eb',
                }}
              >
                <Skeleton width="170px" height={18} />

                {Array.from({ length: cardIndex === 0 ? 1 : 6 }).map(
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
            @keyframes finance-spin {
              to {
                transform: rotate(360deg);
              }
            }

            @keyframes finance-pulse {
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
        animation: 'finance-pulse 1.4s ease-in-out infinite',
      }}
    />
  );
}

function Actions({
  loading,
  onView,
  onEdit,
  onDelete,
  extra,
}: {
  loading: boolean;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  extra?: React.ReactNode;
}) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      <IconOnlyButton title="View" onClick={onView} disabled={loading}>
        <Eye size={15} />
      </IconOnlyButton>

      <IconOnlyButton title="Edit" onClick={onEdit} disabled={loading}>
        <Edit size={15} />
      </IconOnlyButton>

      {extra}

      <IconOnlyButton
        title="Delete"
        onClick={onDelete}
        color="#dc2626"
        disabled={loading}
      >
        <Trash2 size={15} />
      </IconOnlyButton>
    </div>
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

function DetailsModal({
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
          <h2 style={{ margin: 0 }}>
            {record.type}: {data.code}
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
          <Detail label="Code" value={data.code || '-'} />
          <Detail
            label="Title / Invoice"
            value={data.title || data.invoice?.code || '-'}
          />
          <Detail label="Status" value={data.status || '-'} />
          <Detail label="Type" value={data.type || '-'} />
          <Detail label="Amount / Total" value={money(data.amount || data.totalAmount)} />
          <Detail
            label="Date"
            value={formatDate(data.invoiceDate || data.paymentDate || data.createdAt)}
          />
          <Detail label="Reference" value={data.reference || '-'} />
          <Detail
            label="Description / Notes"
            value={data.description || data.notes || '-'}
            wide
          />
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ title, value }: { title: string; value: number | string }) {
  return (
    <Card>
      <p style={{ margin: 0, color: '#6b7280', fontSize: 13 }}>{title}</p>
      <h3 style={{ margin: '8px 0 0' }}>
        {typeof value === 'number' ? money(value) : value}
      </h3>
    </Card>
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

function TabButton({
  active,
  disabled,
  onClick,
  children,
}: {
  active: boolean;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={{
        ...tabButtonStyle(active),
        opacity: disabled ? 0.6 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      {children}
    </button>
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

function money(value?: string | number | null) {
  if (value === null || value === undefined || value === '') return '-';

  return Number(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
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

function toDateInput(value?: string | null) {
  if (!value) return '';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '';

  return date.toISOString().slice(0, 10);
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
  gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
  gap: 16,
  marginBottom: 20,
};

const summarySkeletonCardStyle: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #e5e7eb',
  borderRadius: 12,
  padding: 16,
};

const loadingPanelStyle: React.CSSProperties = {
  minHeight: 620,
  padding: 18,
  borderRadius: 14,
  background: '#ffffff',
  border: '1px solid #e5e7eb',
};

const actionBarStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 8,
  marginBottom: 16,
};

const tabStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 1fr)',
  gap: 8,
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
    padding: '9px 10px',
    borderRadius: 8,
    border: '1px solid #dbe3ef',
    background: active ? '#2563eb' : '#fff',
    color: active ? '#fff' : '#1e293b',
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