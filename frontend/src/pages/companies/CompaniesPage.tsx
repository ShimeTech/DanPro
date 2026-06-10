import { useEffect, useState } from 'react';
import { companiesApi } from '../../api/companies.api';
import type {
  Company,
  CreateCompanyPayload,
  UpdateCompanyPayload,
} from '../../api/companies.api';
import PermissionGuard from '../../components/auth/PermissionGuard';
import { Button, Card, DataTable, Input, PageHeader } from '../../components/ui';

const emptyForm: CreateCompanyPayload = {
  name: '',
  legalName: '',
  email: '',
  phone: '',
  address: '',
  taxNumber: '',
  currency: 'USD',
  timezone: 'UTC',
  language: 'en',
};

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [form, setForm] = useState<CreateCompanyPayload>(emptyForm);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const isSuccess = message.toLowerCase().includes('successfully');

  useEffect(() => {
    loadCompanies({ clearMessage: true });
  }, []);

  async function loadCompanies(options?: { clearMessage?: boolean }) {
    try {
      setLoading(true);

      if (options?.clearMessage) {
        setMessage('');
      }

      const data = await companiesApi.findAll();
      setCompanies(data);
    } catch (error: any) {
      setMessage(error.response?.data?.message || 'Failed to load companies');
    } finally {
      setLoading(false);
    }
  }

  function updateField(name: keyof CreateCompanyPayload, value: string) {
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }
const currencies = [
  { value: 'USD', label: 'USD - US Dollar' },
  { value: 'ETB', label: 'ETB - Ethiopian Birr' },
];

const timezones = [
  'UTC',
  'Africa/Addis_Ababa',
  'Africa/Nairobi',
  'Europe/London',
  'Europe/Paris',
  'America/New_York',
  'America/Chicago',
  'America/Los_Angeles',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Tokyo',
];
  function handleEdit(company: Company) {
    setEditingCompany(company);

    setForm({
      name: company.name || '',
      legalName: company.legalName || '',
      email: company.email || '',
      phone: company.phone || '',
      address: company.address || '',
      taxNumber: company.taxNumber || '',
      currency: company.currency || 'USD',
      timezone: company.timezone || 'UTC',
      language: company.language || 'en',
    });

    setMessage('');
  }

  function handleCancelEdit() {
    setEditingCompany(null);
    setForm(emptyForm);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      setLoading(true);
      setMessage('');

      if (editingCompany) {
        await companiesApi.update(editingCompany.id, form as UpdateCompanyPayload);
        setMessage('Company updated successfully');
      } else {
        await companiesApi.create(form);
        setMessage('Company created successfully');
      }

      setEditingCompany(null);
      setForm(emptyForm);
      await loadCompanies();
    } catch (error: any) {
      setMessage(
        error.response?.data?.message ||
          (editingCompany ? 'Failed to update company' : 'Failed to create company'),
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleDeactivate(id: number) {
    const confirmed = window.confirm('Deactivate this company?');
    if (!confirmed) return;

    try {
      setLoading(true);
      await companiesApi.remove(id);
      setMessage('Company deactivated successfully');
      await loadCompanies();
    } catch (error: any) {
      setMessage(error.response?.data?.message || 'Failed to deactivate company');
    } finally {
      setLoading(false);
    }
  }

  async function handleActivate(company: Company) {
    try {
      setLoading(true);
      await companiesApi.update(company.id, { isActive: true });
      setMessage('Company activated successfully');
      await loadCompanies();
    } catch (error: any) {
      setMessage(error.response?.data?.message || 'Failed to activate company');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Companies"
        description="Manage construction companies, clients, consultants, and contractors."
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

      <div className="module-grid">
        <PermissionGuard permissions={editingCompany ? ['companies:update'] : ['companies:create']}>
          <Card title={editingCompany ? `Edit Company: ${editingCompany.name}` : 'Create Company'}>
            <form onSubmit={handleSubmit}>
              <Input
                label="Company Name"
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                required
              />

              <Input
                label="Legal Name"
                value={form.legalName}
                onChange={(e) => updateField('legalName', e.target.value)}
              />

              <Input
                label="Email"
                type="email"
                value={form.email}
                onChange={(e) => updateField('email', e.target.value)}
              />

              <Input
                label="Phone"
                value={form.phone}
                onChange={(e) => updateField('phone', e.target.value)}
              />

              <Input
                label="Address"
                value={form.address}
                onChange={(e) => updateField('address', e.target.value)}
              />

              <Input
                label="Tax Number"
                value={form.taxNumber}
                onChange={(e) => updateField('taxNumber', e.target.value)}
              />

<div className="form-group">
  <label className="form-label">Currency</label>
  <select
    value={form.currency}
    onChange={(e) => updateField('currency', e.target.value)}
    className="form-select"
  >
    {currencies.map((currency) => (
      <option key={currency.value} value={currency.value}>
        {currency.label}
      </option>
    ))}
  </select>
</div>

<div className="form-group">
  <label className="form-label">Timezone</label>
  <select
    value={form.timezone}
    onChange={(e) => updateField('timezone', e.target.value)}
    className="form-select"
  >
    {timezones.map((timezone) => (
      <option key={timezone} value={timezone}>
        {timezone}
      </option>
    ))}
  </select>
</div>

              <Input
                label="Language"
                value={form.language}
                onChange={(e) => updateField('language', e.target.value)}
              />

              <div style={{ display: 'flex', gap: 10 }}>
                <Button disabled={loading} style={{ flex: 1 }}>
                  {loading
                    ? 'Saving...'
                    : editingCompany
                      ? 'Save Changes'
                      : 'Create Company'}
                </Button>

                {editingCompany && (
                  <Button type="button" variant="secondary" onClick={handleCancelEdit}>
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          </Card>
        </PermissionGuard>

        <Card title="Company List">
          {loading && <p>Loading...</p>}

          <DataTable<Company>
            columns={[
              {
                header: 'Name',
                accessor: 'name',
              },
              {
                header: 'Email',
                accessor: (row) => row.email || '-',
              },
              {
                header: 'Phone',
                accessor: (row) => row.phone || '-',
              },
              {
                header: 'Currency',
                accessor: 'currency',
              },
              {
                header: 'Status',
                accessor: (row) => (row.isActive ? 'Active' : 'Inactive'),
              },
              {
                header: 'Actions',
                accessor: (row) => (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <PermissionGuard permissions={['companies:update']}>
                      <Button
                        variant="secondary"
                        onClick={() => handleEdit(row)}
                        style={{ padding: '6px 10px' }}
                      >
                        Edit
                      </Button>
                    </PermissionGuard>

                    {row.isActive ? (
                      <PermissionGuard permissions={['companies:delete']}>
                        <Button
                          variant="danger"
                          onClick={() => handleDeactivate(row.id)}
                          style={{ padding: '6px 10px' }}
                        >
                          Deactivate
                        </Button>
                      </PermissionGuard>
                    ) : (
                      <PermissionGuard permissions={['companies:update']}>
                        <Button
                          onClick={() => handleActivate(row)}
                          style={{ padding: '6px 10px' }}
                        >
                          Activate
                        </Button>
                      </PermissionGuard>
                    )}
                  </div>
                ),
              },
            ]}
            data={companies}
            emptyMessage="No companies found"
          />
        </Card>
      </div>
    </div>
  );
}