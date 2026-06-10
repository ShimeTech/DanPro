import { useEffect, useMemo, useState } from 'react';
import { Edit, Eye, RefreshCcw, Save, Trash2, X } from 'lucide-react';

import { companiesApi } from '../../api/companies.api';
import type { Company } from '../../api/companies.api';
import { inventoryApi } from '../../api/inventory.api';
import type {
  CreateInventoryTransactionPayload,
  CreateMaterialPayload,
  InventoryTransaction,
  InventoryTransactionType,
  Material,
  ProjectStock,
} from '../../api/inventory.api';
import { projectsApi } from '../../api/projects.api';
import type { Project } from '../../api/projects.api';
import { Button, Card, DataTable, Input, PageHeader } from '../../components/ui';

const transactionTypes: InventoryTransactionType[] = ['RECEIVE', 'ISSUE', 'RETURN', 'ADJUSTMENT'];

type ActiveForm = 'material' | 'transaction';
type ViewRecord =
  | { type: 'material'; data: Material }
  | { type: 'transaction'; data: InventoryTransaction }
  | { type: 'stock'; data: ProjectStock }
  | null;

const emptyMaterialForm = {
  companyId: 0,
  code: '',
  name: '',
  unit: '',
  minStock: 0,
  description: '',
};

const emptyTransactionForm = {
  projectId: 0,
  materialId: 0,
  type: 'RECEIVE',
  quantity: 1,
  unit: '',
  reference: '',
  notes: '',
};

export default function InventoryPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [stock, setStock] = useState<ProjectStock[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | ''>('');
  const [selectedProjectId, setSelectedProjectId] = useState<number | ''>('');
  const [activeForm, setActiveForm] = useState<ActiveForm>('material');
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<InventoryTransaction | null>(null);
  const [viewRecord, setViewRecord] = useState<ViewRecord>(null);
  const [materialForm, setMaterialForm] = useState(emptyMaterialForm);
  const [transactionForm, setTransactionForm] = useState(emptyTransactionForm);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const selectedCompany = useMemo(() => companies.find((item) => item.id === Number(selectedCompanyId)), [companies, selectedCompanyId]);
  const selectedProject = useMemo(() => projects.find((item) => item.id === Number(selectedProjectId)), [projects, selectedProjectId]);

  const filteredMaterials = useMemo(() => filterRecords(materials, search, ['code', 'name', 'unit', 'description']), [materials, search]);
  const filteredTransactions = useMemo(() => filterRecords(transactions, search, ['type', 'reference', 'notes']), [transactions, search]);
  const filteredStock = useMemo(() => filterRecords(stock, search, ['code', 'name', 'unit']), [stock, search]);
  const isSuccess = message.toLowerCase().includes('successfully');

  useEffect(() => {
    loadInitialData();
  }, []);

  async function loadInitialData() {
    try {
      setLoading(true);
      setMessage('');
      const [companyData, projectData] = await Promise.all([
        companiesApi.findAll(),
        projectsApi.findAll(),
      ]);
      setCompanies(companyData);
      setProjects(projectData);
      if (companyData.length > 0) await handleCompanyChange(String(companyData[0].id));
      if (projectData.length > 0) await handleProjectChange(String(projectData[0].id));
    } catch (error: any) {
      setMessage(getErrorMessage(error, 'Failed to load inventory data'));
    } finally {
      setLoading(false);
    }
  }

  async function loadMaterials(companyId: number) {
    const data = await inventoryApi.findMaterials(companyId);
    setMaterials(data);
  }

  async function loadProjectInventory(projectId: number) {
    const [transactionData, stockData] = await Promise.all([
      inventoryApi.findTransactionsByProject(projectId),
      inventoryApi.getProjectStock(projectId),
    ]);
    setTransactions(transactionData);
    setStock(stockData);
  }

  async function handleCompanyChange(value: string) {
    const companyId = Number(value);
    setSelectedCompanyId(companyId || '');
    setMaterialForm((prev) => ({ ...prev, companyId }));
    if (companyId) await loadMaterials(companyId);
  }

  async function handleProjectChange(value: string) {
    const projectId = Number(value);
    setSelectedProjectId(projectId || '');
    setTransactionForm((prev) => ({ ...prev, projectId }));
    if (projectId) await loadProjectInventory(projectId);
  }

  function resetForms() {
    setEditingMaterial(null);
    setEditingTransaction(null);
    setMaterialForm({ ...emptyMaterialForm, companyId: Number(selectedCompanyId || 0) });
    setTransactionForm({ ...emptyTransactionForm, projectId: Number(selectedProjectId || 0) });
  }

  async function saveMaterial(e: React.FormEvent) {
    e.preventDefault();
    if (!materialForm.companyId) return setMessage('Company is required');
    if (!materialForm.code.trim()) return setMessage('Material code is required');
    if (!materialForm.name.trim()) return setMessage('Material name is required');
    if (!materialForm.unit.trim()) return setMessage('Unit is required');

    try {
      setLoading(true);
      setMessage('');
      const payload: CreateMaterialPayload = {
        companyId: Number(materialForm.companyId),
        code: materialForm.code.trim().toUpperCase(),
        name: materialForm.name.trim(),
        unit: materialForm.unit.trim(),
        minStock: Number(materialForm.minStock || 0),
        description: materialForm.description.trim(),
      };

      if (editingMaterial) {
        await inventoryApi.updateMaterial(editingMaterial.id, payload);
        setMessage('Material updated successfully');
      } else {
        await inventoryApi.createMaterial(payload);
        setMessage('Material created successfully');
      }

      resetForms();
      if (selectedCompanyId) await loadMaterials(Number(selectedCompanyId));
    } catch (error: any) {
      setMessage(getErrorMessage(error, editingMaterial ? 'Failed to update material' : 'Failed to create material'));
    } finally {
      setLoading(false);
    }
  }

  async function saveTransaction(e: React.FormEvent) {
    e.preventDefault();
    if (!transactionForm.projectId) return setMessage('Project is required');
    if (!transactionForm.materialId) return setMessage('Material is required');
    if (Number(transactionForm.quantity) <= 0) return setMessage('Quantity must be greater than zero');

    try {
      setLoading(true);
      setMessage('');
      const selectedMaterial = materials.find((item) => item.id === Number(transactionForm.materialId));
      const payload: CreateInventoryTransactionPayload = {
        projectId: Number(transactionForm.projectId),
        materialId: Number(transactionForm.materialId),
        type: transactionForm.type,
        quantity: Number(transactionForm.quantity),
        unit: selectedMaterial?.unit || transactionForm.unit,
        reference: transactionForm.reference.trim(),
        notes: transactionForm.notes.trim(),
      };

      if (editingTransaction) {
        await inventoryApi.updateTransaction(editingTransaction.id, payload);
        setMessage('Transaction updated successfully');
      } else {
        await inventoryApi.createTransaction(payload);
        setMessage('Transaction created successfully');
      }

      resetForms();
      if (selectedProjectId) await loadProjectInventory(Number(selectedProjectId));
    } catch (error: any) {
      setMessage(getErrorMessage(error, editingTransaction ? 'Failed to update transaction' : 'Failed to create transaction'));
    } finally {
      setLoading(false);
    }
  }

  function editMaterial(item: Material) {
    setActiveForm('material');
    setEditingMaterial(item);
    setMaterialForm({
      companyId: item.companyId,
      code: item.code,
      name: item.name,
      unit: item.unit,
      minStock: Number(item.minStock || 0),
      description: item.description || '',
    });
  }

  function editTransaction(item: InventoryTransaction) {
    setActiveForm('transaction');
    setEditingTransaction(item);
    setTransactionForm({
      projectId: item.projectId,
      materialId: item.materialId,
      type: item.type || 'RECEIVE',
      quantity: Number(item.quantity || 1),
      unit: item.unit,
      reference: item.reference || '',
      notes: item.notes || '',
    });
  }

  async function runAction(action: () => Promise<any>, successMessage: string, fallbackError: string) {
    try {
      setLoading(true);
      setMessage('');
      await action();
      setMessage(successMessage);
      if (selectedCompanyId) await loadMaterials(Number(selectedCompanyId));
      if (selectedProjectId) await loadProjectInventory(Number(selectedProjectId));
    } catch (error: any) {
      setMessage(getErrorMessage(error, fallbackError));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <PageHeader title="Inventory" description="Manage materials, stock transactions, project balances, and low-stock alerts." />

      {message && <Alert type={isSuccess ? 'success' : 'error'}>{message}</Alert>}

      <div style={summaryGridStyle}>
        <MetricCard label="Materials" value={materials.length} />
        <MetricCard label="Transactions" value={transactions.length} />
        <MetricCard label="Low Stock" value={stock.filter((item) => item.isLowStock).length} />
        <MetricCard label="Project" value={selectedProject?.code || selectedCompany?.name || '-'} />
      </div>

      <div style={actionBarStyle}>
        <IconActionButton title="Refresh" onClick={() => runAction(async () => undefined, 'Inventory refreshed successfully', 'Failed to refresh inventory')}>
          <RefreshCcw size={16} /> Refresh
        </IconActionButton>
      </div>

      <div className="module-grid">
        <div className="module-sidebar">
          <Card title="Inventory Forms">
            <div style={tabStyle}>
              <button type="button" onClick={() => setActiveForm('material')} style={tabButtonStyle(activeForm === 'material')}>Material</button>
              <button type="button" onClick={() => setActiveForm('transaction')} style={tabButtonStyle(activeForm === 'transaction')}>Transaction</button>
            </div>

            {activeForm === 'material' && (
              <form onSubmit={saveMaterial}>
                <SelectField label="Company" value={materialForm.companyId} onChange={handleCompanyChange}>
                  <option value={0}>Select company</option>
                  {companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
                </SelectField>
                <Input label="Material Code" value={materialForm.code} onChange={(e) => setMaterialForm({ ...materialForm, code: e.target.value })} required />
                <Input label="Material Name" value={materialForm.name} onChange={(e) => setMaterialForm({ ...materialForm, name: e.target.value })} required />
                <Input label="Unit" value={materialForm.unit} onChange={(e) => setMaterialForm({ ...materialForm, unit: e.target.value })} required />
                <Input label="Minimum Stock" type="number" value={materialForm.minStock} onChange={(e) => setMaterialForm({ ...materialForm, minStock: Number(e.target.value) })} />
                <TextareaField label="Description" value={materialForm.description} onChange={(value) => setMaterialForm({ ...materialForm, description: value })} />
                <FormButtons loading={loading} editing={Boolean(editingMaterial)} onCancel={resetForms} label="Material" />
              </form>
            )}

            {activeForm === 'transaction' && (
              <form onSubmit={saveTransaction}>
                <SelectField label="Project" value={transactionForm.projectId} onChange={handleProjectChange}>
                  <option value={0}>Select project</option>
                  {projects.map((project) => <option key={project.id} value={project.id}>{project.code} - {project.name}</option>)}
                </SelectField>
                <SelectField label="Material" value={transactionForm.materialId} onChange={(value) => {
                  const material = materials.find((item) => item.id === Number(value));
                  setTransactionForm({ ...transactionForm, materialId: Number(value), unit: material?.unit || '' });
                }}>
                  <option value={0}>Select material</option>
                  {materials.map((material) => <option key={material.id} value={material.id}>{material.code} - {material.name}</option>)}
                </SelectField>
                <SelectField label="Type" value={transactionForm.type} onChange={(value) => setTransactionForm({ ...transactionForm, type: value })}>
                  {transactionTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                </SelectField>
                <Input label="Quantity" type="number" value={transactionForm.quantity} onChange={(e) => setTransactionForm({ ...transactionForm, quantity: Number(e.target.value) })} required />
                <Input label="Unit" value={transactionForm.unit} disabled />
                <Input label="Reference" value={transactionForm.reference} onChange={(e) => setTransactionForm({ ...transactionForm, reference: e.target.value })} />
                <TextareaField label="Notes" value={transactionForm.notes} onChange={(value) => setTransactionForm({ ...transactionForm, notes: value })} />
                <FormButtons loading={loading} editing={Boolean(editingTransaction)} onCancel={resetForms} label="Transaction" />
              </form>
            )}
          </Card>
        </div>

        <div style={{ display: 'grid', gap: 20 }}>
          <Card title="Inventory Register">
            <Input label="Search" placeholder="Search materials, stock, transactions..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </Card>

          <Card title="Materials">
            <DataTable<Material>
              columns={[
                { header: 'Code', accessor: 'code' },
                { header: 'Name', accessor: 'name' },
                { header: 'Unit', accessor: 'unit' },
                { header: 'Min Stock', accessor: (row) => row.minStock ?? '-' },
                {
                  header: 'Actions',
                  accessor: (row) => (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <IconOnlyButton title="View" onClick={() => setViewRecord({ type: 'material', data: row })}><Eye size={15} /></IconOnlyButton>
                      <IconOnlyButton title="Edit" onClick={() => editMaterial(row)}><Edit size={15} /></IconOnlyButton>
                      <IconOnlyButton title="Delete" onClick={() => runAction(() => inventoryApi.removeMaterial(row.id), 'Material deleted successfully', 'Failed to delete material')} color="#dc2626"><Trash2 size={15} /></IconOnlyButton>
                    </div>
                  ),
                },
              ]}
              data={filteredMaterials}
              emptyMessage="No materials found"
            />
          </Card>

          <Card title="Project Stock Balance">
            <DataTable<ProjectStock>
              columns={[
                { header: 'Code', accessor: 'code' },
                { header: 'Material', accessor: 'name' },
                { header: 'Unit', accessor: 'unit' },
                { header: 'Received', accessor: (row) => formatNumber(row.received) },
                { header: 'Issued', accessor: (row) => formatNumber(row.issued) },
                { header: 'Returned', accessor: (row) => formatNumber(row.returned) },
                { header: 'Adjusted', accessor: (row) => formatNumber(row.adjusted) },
                { header: 'Balance', accessor: (row) => formatNumber(row.balance) },
                { header: 'Status', accessor: (row) => <StatusBadge status={row.isLowStock ? 'LOW STOCK' : 'OK'} /> },
                { header: 'Actions', accessor: (row) => <IconOnlyButton title="View" onClick={() => setViewRecord({ type: 'stock', data: row })}><Eye size={15} /></IconOnlyButton> },
              ]}
              data={filteredStock}
              emptyMessage="No stock records found"
            />
          </Card>

          <Card title="Transactions">
            <DataTable<InventoryTransaction>
              columns={[
                { header: 'Date', accessor: (row) => formatDate(row.createdAt) },
                { header: 'Material', accessor: (row) => row.material?.name || '-' },
                { header: 'Type', accessor: (row) => <StatusBadge status={row.type} /> },
                { header: 'Quantity', accessor: (row) => `${formatNumber(row.quantity)} ${row.unit}` },
                { header: 'Reference', accessor: (row) => row.reference || '-' },
                { header: 'Notes', accessor: (row) => truncate(row.notes) },
                {
                  header: 'Actions',
                  accessor: (row) => (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <IconOnlyButton title="View" onClick={() => setViewRecord({ type: 'transaction', data: row })}><Eye size={15} /></IconOnlyButton>
                      <IconOnlyButton title="Edit" onClick={() => editTransaction(row)}><Edit size={15} /></IconOnlyButton>
                      <IconOnlyButton title="Delete" onClick={() => runAction(() => inventoryApi.removeTransaction(row.id), 'Transaction deleted successfully', 'Failed to delete transaction')} color="#dc2626"><Trash2 size={15} /></IconOnlyButton>
                    </div>
                  ),
                },
              ]}
              data={filteredTransactions}
              emptyMessage="No transactions found"
            />
          </Card>
        </div>
      </div>

      {viewRecord && <InventoryDetailsModal record={viewRecord} onClose={() => setViewRecord(null)} />}
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

function InventoryDetailsModal({ record, onClose }: { record: Exclude<ViewRecord, null>; onClose: () => void }) {
  const data: any = record.data;
  return (
    <div style={modalOverlayStyle} role="dialog" aria-modal="true">
      <div style={modalStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
          <h2 style={{ margin: 0 }}>{record.type.toUpperCase()} - {data.code || data.id}</h2>
          <Button type="button" variant="secondary" onClick={onClose}><X size={15} /> Close</Button>
        </div>
        <div style={detailsGridStyle}>
          <Detail label="Code" value={data.code || '-'} />
          <Detail label="Name / Material" value={data.name || data.material?.name || '-'} />
          <Detail label="Type / Status" value={data.type || (data.isLowStock ? 'LOW STOCK' : 'OK')} />
          <Detail label="Quantity / Balance" value={String(data.quantity ?? data.balance ?? '-')} />
          <Detail label="Unit" value={data.unit || '-'} />
          <Detail label="Reference" value={data.reference || '-'} />
          <Detail label="Description / Notes" value={data.description || data.notes || '-'} wide />
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
  return <div style={{ marginBottom: 12 }}><label style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>{label}</label><textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3} style={{ ...fieldStyle, resize: 'vertical' }} /></div>;
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

function formatNumber(value?: string | number | null) {
  if (value === undefined || value === null || value === '') return '-';
  const number = Number(value);
  if (Number.isNaN(number)) return '-';
  return number.toLocaleString(undefined, { maximumFractionDigits: 2 });
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
const tabStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6, marginBottom: 16 };
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
    case 'LOW STOCK': return { ...base, background: '#fee2e2', color: '#991b1b' };
    case 'OK':
    case 'RECEIVE': return { ...base, background: '#dcfce7', color: '#166534' };
    case 'ISSUE': return { ...base, background: '#fef9c3', color: '#854d0e' };
    case 'RETURN': return { ...base, background: '#dbeafe', color: '#1d4ed8' };
    case 'ADJUSTMENT': return { ...base, background: '#e5e7eb', color: '#374151' };
    default: return { ...base, background: '#f1f5f9', color: '#475569' };
  }
}
