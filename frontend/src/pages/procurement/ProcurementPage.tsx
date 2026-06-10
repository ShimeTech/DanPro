import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Edit,
  Eye,
  RefreshCcw,
  RotateCcw,
  Save,
  Send,
  Trash2,
  X,
  XCircle,
} from 'lucide-react';

import { companiesApi } from '../../api/companies.api';
import type { Company } from '../../api/companies.api';
import { procurementApi } from '../../api/procurement.api';
import type {
  CreatePurchaseOrderPayload,
  CreatePurchaseRequestPayload,
  CreateSupplierPayload,
  ProcurementStatus,
  PurchaseOrder,
  PurchaseRequest,
  Supplier,
} from '../../api/procurement.api';
import { projectsApi } from '../../api/projects.api';
import type { Project } from '../../api/projects.api';
import { Button, Card, DataTable, Input, PageHeader } from '../../components/ui';

const statuses: ProcurementStatus[] = ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'ISSUED', 'CANCELLED', 'CLOSED'];

type ActiveForm = 'supplier' | 'pr' | 'po';
type ViewRecord =
  | { type: 'supplier'; data: Supplier }
  | { type: 'pr'; data: PurchaseRequest }
  | { type: 'po'; data: PurchaseOrder }
  | null;

const emptySupplierForm = {
  companyId: 0,
  name: '',
  email: '',
  phone: '',
  address: '',
  taxNumber: '',
  isActive: true,
};

const emptyPrForm = {
  projectId: 0,
  code: '',
  description: '',
  status: 'DRAFT',
  requestedDate: '',
  itemDescription: '',
  quantity: 1,
  unit: '',
};

const emptyPoForm = {
  projectId: 0,
  supplierId: '',
  code: '',
  description: '',
  status: 'DRAFT',
  orderDate: '',
  itemDescription: '',
  quantity: 1,
  unit: '',
  unitPrice: 0,
  totalAmount: 0,
};

export default function ProcurementPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchaseRequests, setPurchaseRequests] = useState<PurchaseRequest[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | ''>('');
  const [selectedProjectId, setSelectedProjectId] = useState<number | ''>('');
  const [activeForm, setActiveForm] = useState<ActiveForm>('supplier');
  const [viewRecord, setViewRecord] = useState<ViewRecord>(null);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [editingPr, setEditingPr] = useState<PurchaseRequest | null>(null);
  const [editingPo, setEditingPo] = useState<PurchaseOrder | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const [supplierForm, setSupplierForm] = useState(emptySupplierForm);
  const [prForm, setPrForm] = useState(emptyPrForm);
  const [poForm, setPoForm] = useState(emptyPoForm);

  const selectedCompany = useMemo(
    () => companies.find((company) => company.id === Number(selectedCompanyId)),
    [companies, selectedCompanyId],
  );

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === Number(selectedProjectId)),
    [projects, selectedProjectId],
  );

  const filteredSuppliers = useMemo(() => filterRecords(suppliers, search, ['name', 'email', 'phone', 'taxNumber']), [suppliers, search]);
  const filteredPrs = useMemo(() => filterRecords(purchaseRequests, search, ['code', 'description', 'status']), [purchaseRequests, search]);
  const filteredPos = useMemo(() => filterRecords(purchaseOrders, search, ['code', 'description', 'status']), [purchaseOrders, search]);
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
      setMessage(getErrorMessage(error, 'Failed to load procurement data'));
    } finally {
      setLoading(false);
    }
  }

  async function loadSuppliers(companyId: number) {
    if (!companyId) return;
    const data = await procurementApi.findSuppliers(companyId);
    setSuppliers(data);
  }

  async function loadProcurement(projectId: number) {
    if (!projectId) return;

    const [prData, poData] = await Promise.all([
      procurementApi.findPurchaseRequests(projectId),
      procurementApi.findPurchaseOrders(projectId),
    ]);

    setPurchaseRequests(prData);
    setPurchaseOrders(poData);
  }

  async function handleCompanyChange(value: string) {
    const companyId = Number(value);
    setSelectedCompanyId(companyId || '');
    setSupplierForm((prev) => ({ ...prev, companyId }));
    if (companyId) await loadSuppliers(companyId);
  }

  async function handleProjectChange(value: string) {
    const projectId = Number(value);
    setSelectedProjectId(projectId || '');
    setPrForm((prev) => ({ ...prev, projectId }));
    setPoForm((prev) => ({ ...prev, projectId }));
    if (projectId) await loadProcurement(projectId);
  }

  function resetForms() {
    setEditingSupplier(null);
    setEditingPr(null);
    setEditingPo(null);
    setSupplierForm({ ...emptySupplierForm, companyId: Number(selectedCompanyId || 0) });
    setPrForm({ ...emptyPrForm, projectId: Number(selectedProjectId || 0) });
    setPoForm({ ...emptyPoForm, projectId: Number(selectedProjectId || 0) });
  }

  async function saveSupplier(e: React.FormEvent) {
    e.preventDefault();
    if (!supplierForm.companyId) return setMessage('Company is required');
    if (!supplierForm.name.trim()) return setMessage('Supplier name is required');

    try {
      setLoading(true);
      setMessage('');
      const payload: CreateSupplierPayload = {
        companyId: Number(supplierForm.companyId),
        name: supplierForm.name.trim(),
        email: supplierForm.email.trim(),
        phone: supplierForm.phone.trim(),
        address: supplierForm.address.trim(),
        taxNumber: supplierForm.taxNumber.trim(),
        isActive: supplierForm.isActive,
      };

      if (editingSupplier) {
        await procurementApi.updateSupplier(editingSupplier.id, payload);
        setMessage('Supplier updated successfully');
      } else {
        await procurementApi.createSupplier(payload);
        setMessage('Supplier created successfully');
      }

      resetForms();
      if (selectedCompanyId) await loadSuppliers(Number(selectedCompanyId));
    } catch (error: any) {
      setMessage(getErrorMessage(error, editingSupplier ? 'Failed to update supplier' : 'Failed to create supplier'));
    } finally {
      setLoading(false);
    }
  }

  async function savePr(e: React.FormEvent) {
    e.preventDefault();
    if (!prForm.projectId) return setMessage('Project is required');
    if (!prForm.code.trim()) return setMessage('PR code is required');
    if (!prForm.itemDescription.trim()) return setMessage('Item description is required');
    if (!prForm.unit.trim()) return setMessage('Unit is required');

    try {
      setLoading(true);
      setMessage('');
      const payload: CreatePurchaseRequestPayload = {
        projectId: Number(prForm.projectId),
        code: prForm.code.trim().toUpperCase(),
        description: prForm.description.trim(),
        status: prForm.status,
        requestedDate: prForm.requestedDate || undefined,
        items: [
          {
            description: prForm.itemDescription.trim(),
            quantity: Number(prForm.quantity),
            unit: prForm.unit.trim(),
          },
        ],
      };

      if (editingPr) {
        await procurementApi.updatePurchaseRequest(editingPr.id, payload);
        setMessage('Purchase request updated successfully');
      } else {
        await procurementApi.createPurchaseRequest(payload);
        setMessage('Purchase request created successfully');
      }

      resetForms();
      if (selectedProjectId) await loadProcurement(Number(selectedProjectId));
    } catch (error: any) {
      setMessage(getErrorMessage(error, editingPr ? 'Failed to update purchase request' : 'Failed to create purchase request'));
    } finally {
      setLoading(false);
    }
  }

  async function savePo(e: React.FormEvent) {
    e.preventDefault();
    if (!poForm.projectId) return setMessage('Project is required');
    if (!poForm.code.trim()) return setMessage('PO code is required');
    if (!poForm.itemDescription.trim()) return setMessage('Item description is required');
    if (!poForm.unit.trim()) return setMessage('Unit is required');

    try {
      setLoading(true);
      setMessage('');
      const quantity = Number(poForm.quantity);
      const unitPrice = Number(poForm.unitPrice);
      const totalPrice = quantity * unitPrice;
      const payload: CreatePurchaseOrderPayload = {
        projectId: Number(poForm.projectId),
        supplierId: poForm.supplierId ? Number(poForm.supplierId) : undefined,
        code: poForm.code.trim().toUpperCase(),
        description: poForm.description.trim(),
        status: poForm.status,
        orderDate: poForm.orderDate || undefined,
        totalAmount: poForm.totalAmount || totalPrice,
        items: [
          {
            description: poForm.itemDescription.trim(),
            quantity,
            unit: poForm.unit.trim(),
            unitPrice,
            totalPrice,
          },
        ],
      };

      if (editingPo) {
        await procurementApi.updatePurchaseOrder(editingPo.id, payload);
        setMessage('Purchase order updated successfully');
      } else {
        await procurementApi.createPurchaseOrder(payload);
        setMessage('Purchase order created successfully');
      }

      resetForms();
      if (selectedProjectId) await loadProcurement(Number(selectedProjectId));
    } catch (error: any) {
      setMessage(getErrorMessage(error, editingPo ? 'Failed to update purchase order' : 'Failed to create purchase order'));
    } finally {
      setLoading(false);
    }
  }

  function editSupplier(item: Supplier) {
    setActiveForm('supplier');
    setEditingSupplier(item);
    setSupplierForm({
      companyId: item.companyId,
      name: item.name,
      email: item.email || '',
      phone: item.phone || '',
      address: item.address || '',
      taxNumber: item.taxNumber || '',
      isActive: item.isActive,
    });
  }

  function editPr(item: PurchaseRequest) {
    setActiveForm('pr');
    setEditingPr(item);
    const firstItem = item.items?.[0];
    setPrForm({
      projectId: item.projectId,
      code: item.code,
      description: item.description || '',
      status: item.status || 'DRAFT',
      requestedDate: toDateInputValue(item.requestedDate),
      itemDescription: firstItem?.description || '',
      quantity: Number(firstItem?.quantity || 1),
      unit: firstItem?.unit || '',
    });
  }

  function editPo(item: PurchaseOrder) {
    setActiveForm('po');
    setEditingPo(item);
    const firstItem = item.items?.[0];
    setPoForm({
      projectId: item.projectId,
      supplierId: item.supplierId ? String(item.supplierId) : '',
      code: item.code,
      description: item.description || '',
      status: item.status || 'DRAFT',
      orderDate: toDateInputValue(item.orderDate),
      itemDescription: firstItem?.description || '',
      quantity: Number(firstItem?.quantity || 1),
      unit: firstItem?.unit || '',
      unitPrice: Number(firstItem?.unitPrice || 0),
      totalAmount: Number(item.totalAmount || 0),
    });
  }

  async function runAction(action: () => Promise<any>, successMessage: string, fallbackError: string) {
    try {
      setLoading(true);
      setMessage('');
      await action();
      setMessage(successMessage);
      if (selectedCompanyId) await loadSuppliers(Number(selectedCompanyId));
      if (selectedProjectId) await loadProcurement(Number(selectedProjectId));
    } catch (error: any) {
      setMessage(getErrorMessage(error, fallbackError));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <PageHeader title="Procurement" description="Manage suppliers, purchase requests, purchase orders, approvals, issuing, and close-out." />

      {message && <Alert type={isSuccess ? 'success' : 'error'}>{message}</Alert>}

      <div style={summaryGridStyle}>
        <MetricCard label="Suppliers" value={suppliers.length} />
        <MetricCard label="Purchase Requests" value={purchaseRequests.length} />
        <MetricCard label="Purchase Orders" value={purchaseOrders.length} />
        <MetricCard label="Project" value={selectedProject?.code || selectedCompany?.name || '-'} />
      </div>

      <div style={actionBarStyle}>
        <IconActionButton title="Refresh" onClick={() => runAction(async () => undefined, 'Procurement refreshed successfully', 'Failed to refresh procurement')}>
          <RefreshCcw size={16} /> Refresh
        </IconActionButton>
      </div>

      <div className="module-grid">
        <div className="module-sidebar">
          <Card title="Procurement Forms">
            <div style={tabStyle}>
              <button type="button" onClick={() => setActiveForm('supplier')} style={tabButtonStyle(activeForm === 'supplier')}>Supplier</button>
              <button type="button" onClick={() => setActiveForm('pr')} style={tabButtonStyle(activeForm === 'pr')}>PR</button>
              <button type="button" onClick={() => setActiveForm('po')} style={tabButtonStyle(activeForm === 'po')}>PO</button>
            </div>

            {activeForm === 'supplier' && (
              <form onSubmit={saveSupplier}>
                <SelectField label="Company" value={supplierForm.companyId} onChange={handleCompanyChange}>
                  <option value={0}>Select company</option>
                  {companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
                </SelectField>
                <Input label="Supplier Name" value={supplierForm.name} onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })} required />
                <Input label="Email" type="email" value={supplierForm.email} onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })} />
                <Input label="Phone" value={supplierForm.phone} onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })} />
                <Input label="Address" value={supplierForm.address} onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })} />
                <Input label="Tax Number" value={supplierForm.taxNumber} onChange={(e) => setSupplierForm({ ...supplierForm, taxNumber: e.target.value })} />
                <FormButtons loading={loading} editing={Boolean(editingSupplier)} onCancel={resetForms} label="Supplier" />
              </form>
            )}

            {activeForm === 'pr' && (
              <form onSubmit={savePr}>
                <SelectField label="Project" value={prForm.projectId} onChange={handleProjectChange}>
                  <option value={0}>Select project</option>
                  {projects.map((project) => <option key={project.id} value={project.id}>{project.code} - {project.name}</option>)}
                </SelectField>
                <Input label="PR Code" value={prForm.code} onChange={(e) => setPrForm({ ...prForm, code: e.target.value })} required />
                <SelectField label="Status" value={prForm.status} onChange={(value) => setPrForm({ ...prForm, status: value })}>
                  {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
                </SelectField>
                <Input label="Requested Date" type="date" value={prForm.requestedDate} onChange={(e) => setPrForm({ ...prForm, requestedDate: e.target.value })} />
                <TextareaField label="Description" value={prForm.description} onChange={(value) => setPrForm({ ...prForm, description: value })} />
                <Input label="Item Description" value={prForm.itemDescription} onChange={(e) => setPrForm({ ...prForm, itemDescription: e.target.value })} required />
                <Input label="Quantity" type="number" value={prForm.quantity} onChange={(e) => setPrForm({ ...prForm, quantity: Number(e.target.value) })} />
                <Input label="Unit" value={prForm.unit} onChange={(e) => setPrForm({ ...prForm, unit: e.target.value })} required />
                <FormButtons loading={loading} editing={Boolean(editingPr)} onCancel={resetForms} label="Purchase Request" />
              </form>
            )}

            {activeForm === 'po' && (
              <form onSubmit={savePo}>
                <SelectField label="Project" value={poForm.projectId} onChange={handleProjectChange}>
                  <option value={0}>Select project</option>
                  {projects.map((project) => <option key={project.id} value={project.id}>{project.code} - {project.name}</option>)}
                </SelectField>
                <SelectField label="Supplier" value={poForm.supplierId} onChange={(value) => setPoForm({ ...poForm, supplierId: value })}>
                  <option value="">No supplier</option>
                  {suppliers.filter((supplier) => supplier.isActive).map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
                </SelectField>
                <Input label="PO Code" value={poForm.code} onChange={(e) => setPoForm({ ...poForm, code: e.target.value })} required />
                <SelectField label="Status" value={poForm.status} onChange={(value) => setPoForm({ ...poForm, status: value })}>
                  {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
                </SelectField>
                <Input label="Order Date" type="date" value={poForm.orderDate} onChange={(e) => setPoForm({ ...poForm, orderDate: e.target.value })} />
                <TextareaField label="Description" value={poForm.description} onChange={(value) => setPoForm({ ...poForm, description: value })} />
                <Input label="Item Description" value={poForm.itemDescription} onChange={(e) => setPoForm({ ...poForm, itemDescription: e.target.value })} required />
                <Input label="Quantity" type="number" value={poForm.quantity} onChange={(e) => setPoForm({ ...poForm, quantity: Number(e.target.value) })} />
                <Input label="Unit" value={poForm.unit} onChange={(e) => setPoForm({ ...poForm, unit: e.target.value })} required />
                <Input label="Unit Price" type="number" value={poForm.unitPrice} onChange={(e) => setPoForm({ ...poForm, unitPrice: Number(e.target.value) })} />
                <FormButtons loading={loading} editing={Boolean(editingPo)} onCancel={resetForms} label="Purchase Order" />
              </form>
            )}
          </Card>
        </div>

        <div style={{ display: 'grid', gap: 20 }}>
          <Card title="Procurement Register">
            <Input label="Search" placeholder="Search suppliers, PRs, POs..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </Card>

          <Card title="Suppliers">
            <DataTable<Supplier>
              columns={[
                { header: 'Name', accessor: 'name' },
                { header: 'Email', accessor: (row) => row.email || '-' },
                { header: 'Phone', accessor: (row) => row.phone || '-' },
                { header: 'Status', accessor: (row) => <StatusBadge status={row.isActive ? 'ACTIVE' : 'INACTIVE'} /> },
                {
                  header: 'Actions',
                  accessor: (row) => (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <IconOnlyButton title="View" onClick={() => setViewRecord({ type: 'supplier', data: row })}><Eye size={15} /></IconOnlyButton>
                      <IconOnlyButton title="Edit" onClick={() => editSupplier(row)}><Edit size={15} /></IconOnlyButton>
                      {row.isActive ? (
                        <IconOnlyButton title="Deactivate" onClick={() => runAction(() => procurementApi.deactivateSupplier(row.id), 'Supplier deactivated successfully', 'Failed to deactivate supplier')} color="#dc2626"><XCircle size={15} /></IconOnlyButton>
                      ) : (
                        <IconOnlyButton title="Activate" onClick={() => runAction(() => procurementApi.activateSupplier(row.id), 'Supplier activated successfully', 'Failed to activate supplier')} color="#16a34a"><CheckCircle2 size={15} /></IconOnlyButton>
                      )}
                      <IconOnlyButton title="Delete" onClick={() => runAction(() => procurementApi.removeSupplier(row.id), 'Supplier deleted successfully', 'Failed to delete supplier')} color="#dc2626"><Trash2 size={15} /></IconOnlyButton>
                    </div>
                  ),
                },
              ]}
              data={filteredSuppliers}
              emptyMessage="No suppliers found"
            />
          </Card>

          <Card title="Purchase Requests">
            <DataTable<PurchaseRequest>
              columns={[
                { header: 'Code', accessor: 'code' },
                { header: 'Status', accessor: (row) => <StatusBadge status={row.status} /> },
                { header: 'Description', accessor: (row) => truncate(row.description) },
                { header: 'Items', accessor: (row) => row.items?.length ?? 0 },
                {
                  header: 'Actions',
                  accessor: (row) => (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <IconOnlyButton title="View" onClick={() => setViewRecord({ type: 'pr', data: row })}><Eye size={15} /></IconOnlyButton>
                      {['DRAFT', 'SUBMITTED'].includes(String(row.status)) && <IconOnlyButton title="Edit" onClick={() => editPr(row)}><Edit size={15} /></IconOnlyButton>}
                      {row.status === 'DRAFT' && <IconOnlyButton title="Submit" onClick={() => runAction(() => procurementApi.submitPurchaseRequest(row.id), 'Purchase request submitted successfully', 'Failed to submit PR')} color="#2563eb"><Send size={15} /></IconOnlyButton>}
                      {row.status === 'SUBMITTED' && <IconOnlyButton title="Approve" onClick={() => runAction(() => procurementApi.approvePurchaseRequest(row.id), 'Purchase request approved successfully', 'Failed to approve PR')} color="#16a34a"><CheckCircle2 size={15} /></IconOnlyButton>}
                      {row.status === 'SUBMITTED' && <IconOnlyButton title="Reject" onClick={() => runAction(() => procurementApi.rejectPurchaseRequest(row.id), 'Purchase request rejected successfully', 'Failed to reject PR')} color="#dc2626"><XCircle size={15} /></IconOnlyButton>}
                      {row.status !== 'APPROVED' && <IconOnlyButton title="Delete" onClick={() => runAction(() => procurementApi.removePurchaseRequest(row.id), 'Purchase request deleted successfully', 'Failed to delete PR')} color="#dc2626"><Trash2 size={15} /></IconOnlyButton>}
                    </div>
                  ),
                },
              ]}
              data={filteredPrs}
              emptyMessage="No purchase requests found"
            />
          </Card>

          <Card title="Purchase Orders">
            <DataTable<PurchaseOrder>
              columns={[
                { header: 'Code', accessor: 'code' },
                { header: 'Supplier', accessor: (row) => row.supplier?.name || '-' },
                { header: 'Status', accessor: (row) => <StatusBadge status={row.status} /> },
                { header: 'Total', accessor: (row) => formatMoney(row.totalAmount) },
                { header: 'Date', accessor: (row) => formatDate(row.orderDate) },
                {
                  header: 'Actions',
                  accessor: (row) => (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <IconOnlyButton title="View" onClick={() => setViewRecord({ type: 'po', data: row })}><Eye size={15} /></IconOnlyButton>
                      {!['CLOSED', 'CANCELLED'].includes(String(row.status)) && <IconOnlyButton title="Edit" onClick={() => editPo(row)}><Edit size={15} /></IconOnlyButton>}
                      {row.status === 'DRAFT' && <IconOnlyButton title="Issue" onClick={() => runAction(() => procurementApi.issuePurchaseOrder(row.id), 'Purchase order issued successfully', 'Failed to issue PO')} color="#2563eb"><Send size={15} /></IconOnlyButton>}
                      {row.status === 'ISSUED' && <IconOnlyButton title="Close" onClick={() => runAction(() => procurementApi.closePurchaseOrder(row.id), 'Purchase order closed successfully', 'Failed to close PO')} color="#16a34a"><CheckCircle2 size={15} /></IconOnlyButton>}
                      {!['CLOSED', 'CANCELLED'].includes(String(row.status)) && <IconOnlyButton title="Cancel" onClick={() => runAction(() => procurementApi.cancelPurchaseOrder(row.id), 'Purchase order cancelled successfully', 'Failed to cancel PO')} color="#dc2626"><XCircle size={15} /></IconOnlyButton>}
                      {!['ISSUED', 'CLOSED'].includes(String(row.status)) && <IconOnlyButton title="Delete" onClick={() => runAction(() => procurementApi.removePurchaseOrder(row.id), 'Purchase order deleted successfully', 'Failed to delete PO')} color="#dc2626"><Trash2 size={15} /></IconOnlyButton>}
                    </div>
                  ),
                },
              ]}
              data={filteredPos}
              emptyMessage="No purchase orders found"
            />
          </Card>
        </div>
      </div>

      {viewRecord && <ProcurementDetailsModal record={viewRecord} onClose={() => setViewRecord(null)} />}
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

function ProcurementDetailsModal({ record, onClose }: { record: Exclude<ViewRecord, null>; onClose: () => void }) {
  const data: any = record.data;
  return (
    <div style={modalOverlayStyle} role="dialog" aria-modal="true">
      <div style={modalStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
          <h2 style={{ margin: 0 }}>{record.type.toUpperCase()} - {data.code || data.name}</h2>
          <Button type="button" variant="secondary" onClick={onClose}><X size={15} /> Close</Button>
        </div>
        <div style={detailsGridStyle}>
          <Detail label="Name / Code" value={data.name || data.code || '-'} />
          <Detail label="Status" value={data.status || (data.isActive ? 'ACTIVE' : 'INACTIVE')} />
          <Detail label="Supplier" value={data.supplier?.name || '-'} />
          <Detail label="Date" value={formatDate(data.requestedDate || data.orderDate)} />
          <Detail label="Total" value={formatMoney(data.totalAmount)} />
          <Detail label="Items" value={String(data.items?.length ?? 0)} />
          <Detail label="Description" value={data.description || data.address || '-'} wide />
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

function formatMoney(value?: string | number | null) {
  if (value === undefined || value === null || value === '') return '-';
  const amount = Number(value);
  if (Number.isNaN(amount)) return '-';
  return amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
    case 'ACTIVE':
    case 'APPROVED':
    case 'ISSUED': return { ...base, background: '#dcfce7', color: '#166534' };
    case 'SUBMITTED': return { ...base, background: '#dbeafe', color: '#1d4ed8' };
    case 'REJECTED':
    case 'CANCELLED':
    case 'INACTIVE': return { ...base, background: '#fee2e2', color: '#991b1b' };
    case 'CLOSED': return { ...base, background: '#e5e7eb', color: '#374151' };
    default: return { ...base, background: '#f1f5f9', color: '#475569' };
  }
}
