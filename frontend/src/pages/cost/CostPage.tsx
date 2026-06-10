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
import { costApi } from '../../api/cost.api';
import type {
  BoqItem,
  Budget,
  CostSummary,
  Expense,
  Variation,
} from '../../api/cost.api';
import { projectsApi } from '../../api/projects.api';
import type { Project } from '../../api/projects.api';
import { Button, Card, DataTable, Input, PageHeader } from '../../components/ui';

type CostTab = 'boq' | 'budget' | 'expense' | 'variation';
type ViewRecord =
  | { type: 'BOQ Item'; data: BoqItem }
  | { type: 'Budget'; data: Budget }
  | { type: 'Expense'; data: Expense }
  | { type: 'Variation'; data: Variation }
  | null;

const emptyBoqForm = {
  projectId: 0,
  code: '',
  description: '',
  unit: '',
  quantity: 1,
  unitRate: 0,
};

const emptyBudgetForm = {
  projectId: 0,
  code: '',
  title: '',
  description: '',
  amount: 0,
  status: 'DRAFT',
};

const emptyExpenseForm = {
  projectId: 0,
  code: '',
  description: '',
  type: 'OTHER',
  amount: 0,
  expenseDate: '',
  reference: '',
  paidTo: '',
};

const emptyVariationForm = {
  projectId: 0,
  code: '',
  title: '',
  description: '',
  amount: 0,
  status: 'DRAFT',
};

export default function CostPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [boqItems, setBoqItems] = useState<BoqItem[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [variations, setVariations] = useState<Variation[]>([]);
  const [summary, setSummary] = useState<CostSummary | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<number | ''>('');
  const [activeTab, setActiveTab] = useState<CostTab>('boq');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [viewRecord, setViewRecord] = useState<ViewRecord>(null);

  const [editingBoq, setEditingBoq] = useState<BoqItem | null>(null);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [editingVariation, setEditingVariation] = useState<Variation | null>(null);

  const [boqForm, setBoqForm] = useState(emptyBoqForm);
  const [budgetForm, setBudgetForm] = useState(emptyBudgetForm);
  const [expenseForm, setExpenseForm] = useState(emptyExpenseForm);
  const [variationForm, setVariationForm] = useState(emptyVariationForm);

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === Number(selectedProjectId)),
    [projects, selectedProjectId],
  );

  const isSuccess = message.toLowerCase().includes('successfully');

  const filteredBoqItems = useMemo(
    () => filterRecords(boqItems, search, ['code', 'description', 'unit']),
    [boqItems, search],
  );

  const filteredBudgets = useMemo(
    () => filterRecords(budgets, search, ['code', 'title', 'status']),
    [budgets, search],
  );

  const filteredExpenses = useMemo(
    () => filterRecords(expenses, search, ['code', 'description', 'type', 'paidTo']),
    [expenses, search],
  );

  const filteredVariations = useMemo(
    () => filterRecords(variations, search, ['code', 'title', 'status']),
    [variations, search],
  );

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

  async function loadCost(projectId: number) {
    const [boqData, budgetData, expenseData, variationData, summaryData] =
      await Promise.all([
        costApi.findBoqItems(projectId),
        costApi.findBudgets(projectId),
        costApi.findExpenses(projectId),
        costApi.findVariations(projectId),
        costApi.getSummary(projectId),
      ]);

    setBoqItems(boqData);
    setBudgets(budgetData);
    setExpenses(expenseData);
    setVariations(variationData);
    setSummary(summaryData);
  }

  async function handleProjectChange(value: string) {
    const projectId = Number(value);
    setSelectedProjectId(projectId || '');

    setBoqForm((prev) => ({ ...prev, projectId }));
    setBudgetForm((prev) => ({ ...prev, projectId }));
    setExpenseForm((prev) => ({ ...prev, projectId }));
    setVariationForm((prev) => ({ ...prev, projectId }));

    if (!projectId) return;

    try {
      setLoading(true);
      setMessage('');
      await loadCost(projectId);
    } catch (error: any) {
      setMessage(getErrorMessage(error, 'Failed to load cost data'));
    } finally {
      setLoading(false);
    }
  }

  function resetForms() {
    setEditingBoq(null);
    setEditingBudget(null);
    setEditingExpense(null);
    setEditingVariation(null);

    setBoqForm({ ...emptyBoqForm, projectId: Number(selectedProjectId || 0) });
    setBudgetForm({ ...emptyBudgetForm, projectId: Number(selectedProjectId || 0) });
    setExpenseForm({ ...emptyExpenseForm, projectId: Number(selectedProjectId || 0) });
    setVariationForm({ ...emptyVariationForm, projectId: Number(selectedProjectId || 0) });
  }

  async function runAction(action: () => Promise<any>, success: string, fallback: string) {
    try {
      setLoading(true);
      setMessage('');
      await action();
      setMessage(success);
      if (selectedProjectId) await loadCost(Number(selectedProjectId));
    } catch (error: any) {
      setMessage(getErrorMessage(error, fallback));
    } finally {
      setLoading(false);
    }
  }

  async function saveBoqItem(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      ...boqForm,
      projectId: Number(boqForm.projectId),
      quantity: Number(boqForm.quantity),
      unitRate: Number(boqForm.unitRate),
    };

    await runAction(
      async () => {
        if (editingBoq) await costApi.updateBoqItem(editingBoq.id, payload);
        else await costApi.createBoqItem(payload);
        resetForms();
      },
      editingBoq ? 'BOQ item updated successfully' : 'BOQ item created successfully',
      editingBoq ? 'Failed to update BOQ item' : 'Failed to create BOQ item',
    );
  }

  async function saveBudget(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      ...budgetForm,
      projectId: Number(budgetForm.projectId),
      amount: Number(budgetForm.amount),
    };

    await runAction(
      async () => {
        if (editingBudget) await costApi.updateBudget(editingBudget.id, payload);
        else await costApi.createBudget(payload);
        resetForms();
      },
      editingBudget ? 'Budget updated successfully' : 'Budget created successfully',
      editingBudget ? 'Failed to update budget' : 'Failed to create budget',
    );
  }

  async function saveExpense(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      ...expenseForm,
      projectId: Number(expenseForm.projectId),
      amount: Number(expenseForm.amount),
    };

    await runAction(
      async () => {
        if (editingExpense) await costApi.updateExpense(editingExpense.id, payload);
        else await costApi.createExpense(payload);
        resetForms();
      },
      editingExpense ? 'Expense updated successfully' : 'Expense created successfully',
      editingExpense ? 'Failed to update expense' : 'Failed to create expense',
    );
  }

  async function saveVariation(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      ...variationForm,
      projectId: Number(variationForm.projectId),
      amount: Number(variationForm.amount),
    };

    await runAction(
      async () => {
        if (editingVariation) await costApi.updateVariation(editingVariation.id, payload);
        else await costApi.createVariation(payload);
        resetForms();
      },
      editingVariation ? 'Variation updated successfully' : 'Variation created successfully',
      editingVariation ? 'Failed to update variation' : 'Failed to create variation',
    );
  }

  function editBoqItem(row: BoqItem) {
    setActiveTab('boq');
    setEditingBoq(row);
    setBoqForm({
      projectId: row.projectId,
      code: row.code,
      description: row.description,
      unit: row.unit,
      quantity: Number(row.quantity),
      unitRate: Number(row.unitRate),
    });
  }

  function editBudget(row: Budget) {
    setActiveTab('budget');
    setEditingBudget(row);
    setBudgetForm({
      projectId: row.projectId,
      code: row.code,
      title: row.title,
      description: row.description || '',
      amount: Number(row.amount),
      status: row.status || 'DRAFT',
    });
  }

  function editExpense(row: Expense) {
    setActiveTab('expense');
    setEditingExpense(row);
    setExpenseForm({
      projectId: row.projectId,
      code: row.code,
      description: row.description,
      type: row.type || 'OTHER',
      amount: Number(row.amount),
      expenseDate: toDateInput(row.expenseDate),
      reference: row.reference || '',
      paidTo: row.paidTo || '',
    });
  }

  function editVariation(row: Variation) {
    setActiveTab('variation');
    setEditingVariation(row);
    setVariationForm({
      projectId: row.projectId,
      code: row.code,
      title: row.title,
      description: row.description,
      amount: Number(row.amount),
      status: row.status || 'DRAFT',
    });
  }

  return (
    <div>
      <PageHeader
        title="Cost Management"
        description="Manage BOQ, budgets, expenses, variations, and cost performance."
      />

      <SelectField label="Project" value={selectedProjectId} onChange={handleProjectChange}>
        <option value="">Select project</option>
        {projects.map((project) => (
          <option key={project.id} value={project.id}>
            {project.code} - {project.name}
          </option>
        ))}
      </SelectField>

      {message && <Alert type={isSuccess ? 'success' : 'error'}>{message}</Alert>}

      <div style={summaryGridStyle}>
        <SummaryCard title="BOQ Total" value={summary?.boqTotal ?? 0} />
        <SummaryCard title="Budget Total" value={summary?.budgetTotal ?? 0} />
        <SummaryCard title="Approved Variations" value={summary?.approvedVariationTotal ?? 0} />
        <SummaryCard title="Revised Budget" value={summary?.revisedBudget ?? 0} />
        <SummaryCard title="Actual Cost" value={summary?.actualCost ?? 0} />
        <SummaryCard title="Remaining Budget" value={summary?.remainingBudget ?? 0} />
        <SummaryCard title="Cost Performance" value={`${summary?.costPerformancePercent ?? 0}%`} plain />
      </div>

      <div style={actionBarStyle}>
        <IconActionButton
          title="Refresh"
          onClick={() =>
            selectedProjectId &&
            runAction(
              () => loadCost(Number(selectedProjectId)),
              'Cost data refreshed successfully',
              'Failed to refresh cost data',
            )
          }
        >
          <RefreshCcw size={16} /> Refresh
        </IconActionButton>
      </div>

      <div className="module-grid">
        <div className="module-sidebar">
          <Card title="Cost Entry Forms">
            <div style={tabStyle}>
              <TabButton active={activeTab === 'boq'} onClick={() => setActiveTab('boq')}>
                BOQ
              </TabButton>
              <TabButton active={activeTab === 'budget'} onClick={() => setActiveTab('budget')}>
                Budget
              </TabButton>
              <TabButton active={activeTab === 'expense'} onClick={() => setActiveTab('expense')}>
                Expense
              </TabButton>
              <TabButton active={activeTab === 'variation'} onClick={() => setActiveTab('variation')}>
                Variation
              </TabButton>
            </div>

            {activeTab === 'boq' && (
              <form onSubmit={saveBoqItem}>
                <Input label="BOQ Code" value={boqForm.code} onChange={(e) => setBoqForm({ ...boqForm, code: e.target.value })} required />
                <TextareaField label="Description" value={boqForm.description} onChange={(value) => setBoqForm({ ...boqForm, description: value })} />
                <Input label="Unit" value={boqForm.unit} onChange={(e) => setBoqForm({ ...boqForm, unit: e.target.value })} required />
                <Input label="Quantity" type="number" value={boqForm.quantity} onChange={(e) => setBoqForm({ ...boqForm, quantity: Number(e.target.value) })} />
                <Input label="Unit Rate" type="number" value={boqForm.unitRate} onChange={(e) => setBoqForm({ ...boqForm, unitRate: Number(e.target.value) })} />
                <FormButtons loading={loading} editing={Boolean(editingBoq)} onCancel={resetForms} label="BOQ Item" />
              </form>
            )}

            {activeTab === 'budget' && (
              <form onSubmit={saveBudget}>
                <Input label="Budget Code" value={budgetForm.code} onChange={(e) => setBudgetForm({ ...budgetForm, code: e.target.value })} required />
                <Input label="Title" value={budgetForm.title} onChange={(e) => setBudgetForm({ ...budgetForm, title: e.target.value })} required />
                <TextareaField label="Description" value={budgetForm.description} onChange={(value) => setBudgetForm({ ...budgetForm, description: value })} />
                <Input label="Amount" type="number" value={budgetForm.amount} onChange={(e) => setBudgetForm({ ...budgetForm, amount: Number(e.target.value) })} />
                <SelectField label="Status" value={budgetForm.status} onChange={(value) => setBudgetForm({ ...budgetForm, status: value })}>
                  <option value="DRAFT">Draft</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                  <option value="CANCELLED">Cancelled</option>
                </SelectField>
                <FormButtons loading={loading} editing={Boolean(editingBudget)} onCancel={resetForms} label="Budget" />
              </form>
            )}

            {activeTab === 'expense' && (
              <form onSubmit={saveExpense}>
                <Input label="Expense Code" value={expenseForm.code} onChange={(e) => setExpenseForm({ ...expenseForm, code: e.target.value })} required />
                <TextareaField label="Description" value={expenseForm.description} onChange={(value) => setExpenseForm({ ...expenseForm, description: value })} />
                <SelectField label="Type" value={expenseForm.type} onChange={(value) => setExpenseForm({ ...expenseForm, type: value })}>
                  <option value="MATERIAL">Material</option>
                  <option value="LABOR">Labor</option>
                  <option value="EQUIPMENT">Equipment</option>
                  <option value="SUBCONTRACTOR">Subcontractor</option>
                  <option value="GENERAL">General</option>
                  <option value="OTHER">Other</option>
                </SelectField>
                <Input label="Amount" type="number" value={expenseForm.amount} onChange={(e) => setExpenseForm({ ...expenseForm, amount: Number(e.target.value) })} />
                <Input label="Expense Date" type="date" value={expenseForm.expenseDate} onChange={(e) => setExpenseForm({ ...expenseForm, expenseDate: e.target.value })} required />
                <Input label="Reference" value={expenseForm.reference} onChange={(e) => setExpenseForm({ ...expenseForm, reference: e.target.value })} />
                <Input label="Paid To" value={expenseForm.paidTo} onChange={(e) => setExpenseForm({ ...expenseForm, paidTo: e.target.value })} />
                <FormButtons loading={loading} editing={Boolean(editingExpense)} onCancel={resetForms} label="Expense" />
              </form>
            )}

            {activeTab === 'variation' && (
              <form onSubmit={saveVariation}>
                <Input label="Variation Code" value={variationForm.code} onChange={(e) => setVariationForm({ ...variationForm, code: e.target.value })} required />
                <Input label="Title" value={variationForm.title} onChange={(e) => setVariationForm({ ...variationForm, title: e.target.value })} required />
                <TextareaField label="Description" value={variationForm.description} onChange={(value) => setVariationForm({ ...variationForm, description: value })} />
                <Input label="Amount" type="number" value={variationForm.amount} onChange={(e) => setVariationForm({ ...variationForm, amount: Number(e.target.value) })} />
                <SelectField label="Status" value={variationForm.status} onChange={(value) => setVariationForm({ ...variationForm, status: value })}>
                  <option value="DRAFT">Draft</option>
                  <option value="SUBMITTED">Submitted</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                </SelectField>
                <FormButtons loading={loading} editing={Boolean(editingVariation)} onCancel={resetForms} label="Variation" />
              </form>
            )}
          </Card>
        </div>

        <div style={{ display: 'grid', gap: 20 }}>
          <Card title="Cost Register">
            <Input label="Search" placeholder="Search BOQ, budgets, expenses, variations..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </Card>

          <Card title="BOQ Items">
            <DataTable<BoqItem>
              columns={[
                { header: 'Code', accessor: 'code' },
                { header: 'Description', accessor: (row) => truncate(row.description) },
                { header: 'Unit', accessor: 'unit' },
                { header: 'Qty', accessor: (row) => number(row.quantity) },
                { header: 'Rate', accessor: (row) => money(row.unitRate) },
                { header: 'Total', accessor: (row) => money(row.totalAmount) },
                {
                  header: 'Actions',
                  accessor: (row) => (
                    <Actions
                      onView={() => setViewRecord({ type: 'BOQ Item', data: row })}
                      onEdit={() => editBoqItem(row)}
                      onDelete={() => runAction(() => costApi.removeBoqItem(row.id), 'BOQ item deleted successfully', 'Failed to delete BOQ item')}
                    />
                  ),
                },
              ]}
              data={filteredBoqItems}
              emptyMessage="No BOQ items found"
            />
          </Card>

          <Card title="Budgets">
            <DataTable<Budget>
              columns={[
                { header: 'Code', accessor: 'code' },
                { header: 'Title', accessor: 'title' },
                { header: 'Status', accessor: (row) => <StatusBadge status={row.status} /> },
                { header: 'Amount', accessor: (row) => money(row.amount) },
                {
                  header: 'Actions',
                  accessor: (row) => (
                    <Actions
                      onView={() => setViewRecord({ type: 'Budget', data: row })}
                      onEdit={() => editBudget(row)}
                      onDelete={() => runAction(() => costApi.removeBudget(row.id), 'Budget deleted successfully', 'Failed to delete budget')}
                      extra={
                        row.status === 'DRAFT' ? (
                          <>
                            <IconOnlyButton title="Approve" color="#16a34a" onClick={() => runAction(() => costApi.approveBudget(row.id), 'Budget approved successfully', 'Failed to approve budget')}>
                              <CheckCircle2 size={15} />
                            </IconOnlyButton>
                            <IconOnlyButton title="Reject" color="#dc2626" onClick={() => runAction(() => costApi.rejectBudget(row.id), 'Budget rejected successfully', 'Failed to reject budget')}>
                              <XCircle size={15} />
                            </IconOnlyButton>
                          </>
                        ) : null
                      }
                    />
                  ),
                },
              ]}
              data={filteredBudgets}
              emptyMessage="No budgets found"
            />
          </Card>

          <Card title="Expenses">
            <DataTable<Expense>
              columns={[
                { header: 'Code', accessor: 'code' },
                { header: 'Type', accessor: (row) => <StatusBadge status={row.type} /> },
                { header: 'Amount', accessor: (row) => money(row.amount) },
                { header: 'Date', accessor: (row) => formatDate(row.expenseDate) },
                { header: 'Paid To', accessor: (row) => row.paidTo || '-' },
                {
                  header: 'Actions',
                  accessor: (row) => (
                    <Actions
                      onView={() => setViewRecord({ type: 'Expense', data: row })}
                      onEdit={() => editExpense(row)}
                      onDelete={() => runAction(() => costApi.removeExpense(row.id), 'Expense deleted successfully', 'Failed to delete expense')}
                    />
                  ),
                },
              ]}
              data={filteredExpenses}
              emptyMessage="No expenses found"
            />
          </Card>

          <Card title="Variations">
            <DataTable<Variation>
              columns={[
                { header: 'Code', accessor: 'code' },
                { header: 'Title', accessor: 'title' },
                { header: 'Status', accessor: (row) => <StatusBadge status={row.status} /> },
                { header: 'Amount', accessor: (row) => money(row.amount) },
                { header: 'Approved At', accessor: (row) => formatDate(row.approvedAt) },
                {
                  header: 'Actions',
                  accessor: (row) => (
                    <Actions
                      onView={() => setViewRecord({ type: 'Variation', data: row })}
                      onEdit={() => editVariation(row)}
                      onDelete={() => runAction(() => costApi.removeVariation(row.id), 'Variation deleted successfully', 'Failed to delete variation')}
                      extra={
                        row.status === 'DRAFT' ? (
                          <IconOnlyButton title="Submit" color="#2563eb" onClick={() => runAction(() => costApi.submitVariation(row.id), 'Variation submitted successfully', 'Failed to submit variation')}>
                            <Send size={15} />
                          </IconOnlyButton>
                        ) : row.status === 'SUBMITTED' ? (
                          <>
                            <IconOnlyButton title="Approve" color="#16a34a" onClick={() => runAction(() => costApi.approveVariation(row.id), 'Variation approved successfully', 'Failed to approve variation')}>
                              <CheckCircle2 size={15} />
                            </IconOnlyButton>
                            <IconOnlyButton title="Reject" color="#dc2626" onClick={() => runAction(() => costApi.rejectVariation(row.id), 'Variation rejected successfully', 'Failed to reject variation')}>
                              <XCircle size={15} />
                            </IconOnlyButton>
                          </>
                        ) : null
                      }
                    />
                  ),
                },
              ]}
              data={filteredVariations}
              emptyMessage="No variations found"
            />
          </Card>
        </div>
      </div>

      {viewRecord && <DetailsModal record={viewRecord} onClose={() => setViewRecord(null)} />}
    </div>
  );
}

function Actions({
  onView,
  onEdit,
  onDelete,
  extra,
}: {
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  extra?: React.ReactNode;
}) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      <IconOnlyButton title="View" onClick={onView}><Eye size={15} /></IconOnlyButton>
      <IconOnlyButton title="Edit" onClick={onEdit}><Edit size={15} /></IconOnlyButton>
      {extra}
      <IconOnlyButton title="Delete" onClick={onDelete} color="#dc2626"><Trash2 size={15} /></IconOnlyButton>
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
        {loading ? 'Saving...' : editing ? <><Save size={15} /> Save Changes</> : `Create ${label}`}
      </Button>
      {editing && (
        <Button type="button" variant="secondary" onClick={onCancel}>
          <X size={15} /> Cancel
        </Button>
      )}
    </div>
  );
}

function DetailsModal({ record, onClose }: { record: Exclude<ViewRecord, null>; onClose: () => void }) {
  const data: any = record.data;

  return (
    <div style={modalOverlayStyle} role="dialog" aria-modal="true">
      <div style={modalStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
          <h2 style={{ margin: 0 }}>{record.type}: {data.code}</h2>
          <Button type="button" variant="secondary" onClick={onClose}><X size={15} /> Close</Button>
        </div>

        <div style={detailsGridStyle}>
          <Detail label="Code" value={data.code || '-'} />
          <Detail label="Title" value={data.title || '-'} />
          <Detail label="Status / Type" value={data.status || data.type || '-'} />
          <Detail label="Amount" value={money(data.amount || data.totalAmount)} />
          <Detail label="Date" value={formatDate(data.expenseDate || data.approvedAt || data.createdAt)} />
          <Detail label="Reference" value={data.reference || '-'} />
          <Detail label="Description" value={data.description || '-'} wide />
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ title, value, plain }: { title: string; value: number | string; plain?: boolean }) {
  return (
    <Card>
      <p style={{ margin: 0, color: '#6b7280', fontSize: 13 }}>{title}</p>
      <h3 style={{ margin: '8px 0 0' }}>{plain ? value : typeof value === 'number' ? money(value) : value}</h3>
    </Card>
  );
}

function Alert({ type, children }: { type: 'success' | 'error'; children: React.ReactNode }) {
  const success = type === 'success';
  return (
    <div
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
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={fieldStyle}>{children}</select>
    </div>
  );
}

function TextareaField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>{label}</label>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3} style={{ ...fieldStyle, resize: 'vertical' }} />
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

function money(value?: string | number | null) {
  if (value === null || value === undefined || value === '') return '-';
  return Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function number(value?: string | number | null) {
  if (value === null || value === undefined || value === '') return '-';
  return Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 });
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

const summaryGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
  gap: 16,
  marginBottom: 20,
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

function tabButtonStyle(active: boolean): React.CSSProperties {
  return {
    padding: '9px 10px',
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
    case 'APPROVED':
      return { ...base, background: '#dcfce7', color: '#166534' };
    case 'SUBMITTED':
      return { ...base, background: '#dbeafe', color: '#1d4ed8' };
    case 'REJECTED':
    case 'CANCELLED':
      return { ...base, background: '#fee2e2', color: '#991b1b' };
    case 'MATERIAL':
      return { ...base, background: '#fef9c3', color: '#854d0e' };
    default:
      return { ...base, background: '#f1f5f9', color: '#475569' };
  }
}