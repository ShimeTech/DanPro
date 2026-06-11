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

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [form, setForm] = useState<CreateCompanyPayload>(emptyForm);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState('');

  const isSuccess = message.toLowerCase().includes('successfully');

  useEffect(() => {
    loadCompanies({ initialLoad: true, clearMessage: true });
  }, []);

  async function loadCompanies(options?: {
    initialLoad?: boolean;
    clearMessage?: boolean;
  }) {
    try {
      if (options?.initialLoad) {
        setPageLoading(true);
      }

      if (options?.clearMessage) {
        setMessage('');
      }

      const data = await companiesApi.findAll();
      setCompanies(data);
    } catch (error: any) {
      setMessage(error.response?.data?.message || 'Failed to load companies');
    } finally {
      if (options?.initialLoad) {
        setPageLoading(false);
      }
    }
  }

  function updateField(name: keyof CreateCompanyPayload, value: string) {
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

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
    setMessage('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      setActionLoading(true);
      setMessage('');

      if (editingCompany) {
        await companiesApi.update(
          editingCompany.id,
          form as UpdateCompanyPayload,
        );
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
          (editingCompany
            ? 'Failed to update company'
            : 'Failed to create company'),
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDeactivate(id: number) {
    const confirmed = window.confirm('Deactivate this company?');
    if (!confirmed) return;

    try {
      setActionLoading(true);
      setMessage('');

      await companiesApi.remove(id);
      setMessage('Company deactivated successfully');
      await loadCompanies();
    } catch (error: any) {
      setMessage(
        error.response?.data?.message || 'Failed to deactivate company',
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function handleActivate(company: Company) {
    try {
      setActionLoading(true);
      setMessage('');

      await companiesApi.update(company.id, { isActive: true });
      setMessage('Company activated successfully');
      await loadCompanies();
    } catch (error: any) {
      setMessage(error.response?.data?.message || 'Failed to activate company');
    } finally {
      setActionLoading(false);
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
          role="alert"
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

      {pageLoading ? (
        <CompaniesLoading />
      ) : (
        <div className="module-grid">
          <PermissionGuard
            permissions={
              editingCompany ? ['companies:update'] : ['companies:create']
            }
          >
            <Card
              title={
                editingCompany
                  ? `Edit Company: ${editingCompany.name}`
                  : 'Create Company'
              }
            >
              <form onSubmit={handleSubmit} aria-busy={actionLoading}>
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
                  <label className="form-label" htmlFor="company-currency">
                    Currency
                  </label>

                  <select
                    id="company-currency"
                    value={form.currency}
                    onChange={(e) => updateField('currency', e.target.value)}
                    className="form-select"
                    disabled={actionLoading}
                  >
                    {currencies.map((currency) => (
                      <option key={currency.value} value={currency.value}>
                        {currency.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="company-timezone">
                    Timezone
                  </label>

                  <select
                    id="company-timezone"
                    value={form.timezone}
                    onChange={(e) => updateField('timezone', e.target.value)}
                    className="form-select"
                    disabled={actionLoading}
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
                  <Button disabled={actionLoading} style={{ flex: 1 }}>
                    {actionLoading
                      ? 'Saving...'
                      : editingCompany
                        ? 'Save Changes'
                        : 'Create Company'}
                  </Button>

                  {editingCompany && (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleCancelEdit}
                      disabled={actionLoading}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </form>
            </Card>
          </PermissionGuard>

          <Card title="Company List">
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
                  accessor: (row) => (
                    <span
                      style={{
                        color: row.isActive ? '#15803d' : '#991b1b',
                        fontWeight: 700,
                      }}
                    >
                      {row.isActive ? 'Active' : 'Inactive'}
                    </span>
                  ),
                },
                {
                  header: 'Actions',
                  accessor: (row) => (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <PermissionGuard permissions={['companies:update']}>
                        <Button
                          variant="secondary"
                          onClick={() => handleEdit(row)}
                          disabled={actionLoading}
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
                            disabled={actionLoading}
                            style={{ padding: '6px 10px' }}
                          >
                            Deactivate
                          </Button>
                        </PermissionGuard>
                      ) : (
                        <PermissionGuard permissions={['companies:update']}>
                          <Button
                            onClick={() => handleActivate(row)}
                            disabled={actionLoading}
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
      )}
    </div>
  );
}

function CompaniesLoading() {
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
              animation: 'companies-spin 0.8s linear infinite',
            }}
          />

          <div>
            <strong style={{ color: '#111827' }}>
              Loading companies
            </strong>

            <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: 14 }}>
              Retrieving company records from the server. Please wait.
            </p>
          </div>
        </div>

        <div className="module-grid">
          <div
            style={{
              minHeight: 520,
              padding: 18,
              borderRadius: 14,
              background: '#ffffff',
              border: '1px solid #e5e7eb',
            }}
          >
            <Skeleton width="180px" height={18} />

            {Array.from({ length: 9 }).map((_, index) => (
              <Skeleton
                key={index}
                width="100%"
                height={38}
                marginTop={18}
              />
            ))}
          </div>

          <div
            style={{
              minHeight: 520,
              padding: 18,
              borderRadius: 14,
              background: '#ffffff',
              border: '1px solid #e5e7eb',
            }}
          >
            <Skeleton width="160px" height={18} />

            {Array.from({ length: 7 }).map((_, index) => (
              <Skeleton
                key={index}
                width={index === 0 ? '100%' : `${78 + (index % 2) * 18}%`}
                height={30}
                marginTop={20}
              />
            ))}
          </div>
        </div>

        <style>
          {`
            @keyframes companies-spin {
              to {
                transform: rotate(360deg);
              }
            }

            @keyframes companies-pulse {
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
        animation: 'companies-pulse 1.4s ease-in-out infinite',
      }}
    />
  );
}