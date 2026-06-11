import { useEffect, useMemo, useState } from 'react';
import {
  Edit,
  RefreshCcw,
  Save,
  Search,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';

import { settingsApi } from '../../api/settings.api';
import type { Permission, Role } from '../../api/settings.api';
import { Button, Card, DataTable, Input, PageHeader } from '../../components/ui';

const emptyRoleForm = {
  name: '',
  description: '',
  isSystem: false,
};

export default function SettingsPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<number | ''>('');
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<number[]>([]);
  const [permissionSearch, setPermissionSearch] = useState('');
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [roleForm, setRoleForm] = useState(emptyRoleForm);

  const [pageLoading, setPageLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState('');

  const selectedRole = roles.find((role) => role.id === Number(selectedRoleId));
  const isSuccess = message.toLowerCase().includes('successfully');

  const filteredPermissions = useMemo(() => {
    const query = permissionSearch.trim().toLowerCase();

    return permissions.filter((permission) => {
      if (!query) return true;

      return (
        permission.module.toLowerCase().includes(query) ||
        permission.action.toLowerCase().includes(query) ||
        String(permission.description || '').toLowerCase().includes(query)
      );
    });
  }, [permissions, permissionSearch]);

  const groupedPermissions = useMemo(() => {
    return Object.entries(
      filteredPermissions.reduce<Record<string, Permission[]>>(
        (group, permission) => {
          group[permission.module] = group[permission.module] || [];
          group[permission.module].push(permission);
          return group;
        },
        {},
      ),
    );
  }, [filteredPermissions]);

  useEffect(() => {
    loadInitialSettings();
  }, []);

  useEffect(() => {
    const role = roles.find((item) => item.id === Number(selectedRoleId));

    setSelectedPermissionIds(
      role?.rolePermissions?.map((item) => item.permissionId) ?? [],
    );
  }, [selectedRoleId, roles]);

  async function loadInitialSettings() {
    try {
      setPageLoading(true);
      setMessage('');

      const [roleData, permissionData] = await Promise.all([
        settingsApi.findRoles(),
        settingsApi.findPermissions(),
      ]);

      setRoles(roleData);
      setPermissions(permissionData);

      if (roleData.length > 0) {
        setSelectedRoleId(roleData[0].id);
      }
    } catch (error: any) {
      setMessage(getErrorMessage(error, 'Failed to load settings'));
    } finally {
      setPageLoading(false);
    }
  }

  async function refreshSettings() {
    try {
      setActionLoading(true);
      setMessage('');

      const [roleData, permissionData] = await Promise.all([
        settingsApi.findRoles(),
        settingsApi.findPermissions(),
      ]);

      setRoles(roleData);
      setPermissions(permissionData);

      if (!selectedRoleId && roleData.length > 0) {
        setSelectedRoleId(roleData[0].id);
      }

      setMessage('Settings refreshed successfully');
    } catch (error: any) {
      setMessage(getErrorMessage(error, 'Failed to refresh settings'));
    } finally {
      setActionLoading(false);
    }
  }

  async function saveRole(e: React.FormEvent) {
    e.preventDefault();

    if (!roleForm.name.trim()) {
      setMessage('Role name is required');
      return;
    }

    try {
      setActionLoading(true);
      setMessage('');

      const payload = {
        ...roleForm,
        name: roleForm.name.trim(),
        description: roleForm.description.trim(),
      };

      if (editingRole) {
        await settingsApi.updateRole(editingRole.id, payload);
        setMessage('Role updated successfully');
      } else {
        await settingsApi.createRole(payload);
        setMessage('Role created successfully');
      }

      resetRoleForm();
      await refreshSettingsAfterAction();
    } catch (error: any) {
      setMessage(getErrorMessage(error, 'Failed to save role'));
    } finally {
      setActionLoading(false);
    }
  }

  async function refreshSettingsAfterAction() {
    const [roleData, permissionData] = await Promise.all([
      settingsApi.findRoles(),
      settingsApi.findPermissions(),
    ]);

    setRoles(roleData);
    setPermissions(permissionData);

    if (!selectedRoleId && roleData.length > 0) {
      setSelectedRoleId(roleData[0].id);
    }
  }

  function editRole(role: Role) {
    setEditingRole(role);

    setRoleForm({
      name: role.name,
      description: role.description || '',
      isSystem: role.isSystem,
    });

    setMessage('');
  }

  async function deleteRole(role: Role) {
    if (role.isSystem) {
      setMessage('System roles cannot be deleted');
      return;
    }

    if (!window.confirm(`Delete role "${role.name}"?`)) return;

    try {
      setActionLoading(true);
      setMessage('');

      await settingsApi.removeRole(role.id);

      if (selectedRoleId === role.id) {
        setSelectedRoleId('');
      }

      setMessage('Role deleted successfully');
      await refreshSettingsAfterAction();
    } catch (error: any) {
      setMessage(getErrorMessage(error, 'Failed to delete role'));
    } finally {
      setActionLoading(false);
    }
  }

  function resetRoleForm() {
    setEditingRole(null);
    setRoleForm(emptyRoleForm);
  }

  function togglePermission(permissionId: number) {
    setSelectedPermissionIds((prev) =>
      prev.includes(permissionId)
        ? prev.filter((id) => id !== permissionId)
        : [...prev, permissionId],
    );
  }

  function toggleModulePermissions(modulePermissions: Permission[]) {
    const modulePermissionIds = modulePermissions.map((item) => item.id);
    const allSelected = modulePermissionIds.every((id) =>
      selectedPermissionIds.includes(id),
    );

    if (allSelected) {
      setSelectedPermissionIds((prev) =>
        prev.filter((id) => !modulePermissionIds.includes(id)),
      );
    } else {
      setSelectedPermissionIds((prev) => [
        ...new Set([...prev, ...modulePermissionIds]),
      ]);
    }
  }

  async function savePermissionMatrix() {
    if (!selectedRoleId) {
      setMessage('Select role first');
      return;
    }

    try {
      setActionLoading(true);
      setMessage('');

      await settingsApi.syncPermissions(
        Number(selectedRoleId),
        selectedPermissionIds,
      );

      setMessage('Permissions updated successfully');
      await refreshSettingsAfterAction();
    } catch (error: any) {
      setMessage(getErrorMessage(error, 'Failed to update permissions'));
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Manage roles, permissions, RBAC access control, and system configuration."
      />

      {message && <Alert type={isSuccess ? 'success' : 'error'}>{message}</Alert>}

      {pageLoading ? (
        <SettingsLoading />
      ) : (
        <>
          <div style={actionBarStyle}>
            <IconActionButton
              title="Refresh Settings"
              onClick={refreshSettings}
              disabled={actionLoading}
            >
              <RefreshCcw size={16} /> Refresh
            </IconActionButton>
          </div>

          <div className="module-grid">
            <div className="module-sidebar">
              <Card title={editingRole ? 'Edit Role' : 'Create Role'}>
                <form onSubmit={saveRole} aria-busy={actionLoading}>
                  <Input
                    label="Role Name"
                    value={roleForm.name}
                    onChange={(e) =>
                      setRoleForm({ ...roleForm, name: e.target.value })
                    }
                    required
                  />

                  <TextareaField
                    label="Description"
                    value={roleForm.description}
                    disabled={actionLoading}
                    onChange={(value) =>
                      setRoleForm({ ...roleForm, description: value })
                    }
                  />

                  <label style={checkboxLabelStyle}>
                    <input
                      type="checkbox"
                      checked={roleForm.isSystem}
                      disabled={actionLoading}
                      onChange={(e) =>
                        setRoleForm({
                          ...roleForm,
                          isSystem: e.target.checked,
                        })
                      }
                    />
                    System Role
                  </label>

                  <div style={{ display: 'flex', gap: 8 }}>
                    <Button disabled={actionLoading} style={{ flex: 1 }}>
                      {actionLoading ? (
                        'Saving...'
                      ) : editingRole ? (
                        <>
                          <Save size={15} /> Save Changes
                        </>
                      ) : (
                        'Create Role'
                      )}
                    </Button>

                    {editingRole && (
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={resetRoleForm}
                        disabled={actionLoading}
                      >
                        <X size={15} /> Cancel
                      </Button>
                    )}
                  </div>
                </form>
              </Card>

              <Card title="Permission Matrix">
                <SelectField
                  label="Role"
                  value={selectedRoleId}
                  disabled={actionLoading}
                  onChange={(value) =>
                    setSelectedRoleId(value ? Number(value) : '')
                  }
                >
                  <option value="">Select role</option>

                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </SelectField>

                <div style={{ position: 'relative' }}>
                  <Input
                    label="Search Permissions"
                    value={permissionSearch}
                    onChange={(e) => setPermissionSearch(e.target.value)}
                    placeholder="Search module, action, description..."
                  />

                  <Search
                    size={15}
                    style={{
                      position: 'absolute',
                      right: 12,
                      bottom: 12,
                      color: '#64748b',
                    }}
                  />
                </div>

                <div style={permissionPanelStyle}>
                  {groupedPermissions.map(([module, modulePermissions]) => {
                    const modulePermissionIds = modulePermissions.map(
                      (item) => item.id,
                    );
                    const allSelected = modulePermissionIds.every((id) =>
                      selectedPermissionIds.includes(id),
                    );

                    return (
                      <div key={module} style={{ marginBottom: 18 }}>
                        <label style={moduleLabelStyle}>
                          <input
                            type="checkbox"
                            checked={allSelected}
                            disabled={actionLoading}
                            onChange={() =>
                              toggleModulePermissions(modulePermissions)
                            }
                          />
                          {module}
                        </label>

                        {modulePermissions.map((permission) => (
                          <label key={permission.id} style={permissionLabelStyle}>
                            <input
                              type="checkbox"
                              checked={selectedPermissionIds.includes(
                                permission.id,
                              )}
                              disabled={actionLoading || !selectedRoleId}
                              onChange={() => togglePermission(permission.id)}
                            />

                            <span>
                              {permission.module}:{permission.action}
                            </span>
                          </label>
                        ))}
                      </div>
                    );
                  })}
                </div>

                <Button
                  type="button"
                  disabled={actionLoading || !selectedRoleId}
                  onClick={savePermissionMatrix}
                  style={{ width: '100%', marginTop: 12 }}
                >
                  {actionLoading ? (
                    'Saving...'
                  ) : (
                    <>
                      <ShieldCheck size={15} /> Save Permissions
                    </>
                  )}
                </Button>
              </Card>

              <Card title="System Info">
                <InfoItem label="Application" value="BuildPro IMS" />
                <InfoItem label="Frontend" value="React + TypeScript" />
                <InfoItem label="Backend" value="NestJS + Prisma" />
                <InfoItem label="Database" value="MySQL" />
                <InfoItem label="Authentication" value="JWT" />
                <InfoItem label="Authorization" value="RBAC" />
              </Card>
            </div>

            <div className="module-content">
              <Card title="Roles">
                <DataTable<Role>
                  columns={[
                    { header: 'ID', accessor: (row) => `#${row.id}` },
                    { header: 'Name', accessor: 'name' },
                    {
                      header: 'Description',
                      accessor: (row) => row.description || '-',
                    },
                    {
                      header: 'System',
                      accessor: (row) => (row.isSystem ? 'Yes' : 'No'),
                    },
                    {
                      header: 'Permissions',
                      accessor: (row) => row.rolePermissions?.length ?? 0,
                    },
                    {
                      header: 'Actions',
                      accessor: (row) => (
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => editRole(row)}
                            disabled={actionLoading}
                            style={{ padding: '6px 10px' }}
                          >
                            <Edit size={14} />
                          </Button>

                          <Button
                            type="button"
                            variant="danger"
                            onClick={() => deleteRole(row)}
                            disabled={actionLoading || row.isSystem}
                            style={{ padding: '6px 10px' }}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      ),
                    },
                  ]}
                  data={roles}
                  emptyMessage="No roles found"
                />
              </Card>

              <Card
                title={
                  selectedRole
                    ? `Permissions for ${selectedRole.name}`
                    : 'Selected Role Permissions'
                }
              >
                <Input
                  label="Search Assigned Permissions"
                  value={permissionSearch}
                  onChange={(e) => setPermissionSearch(e.target.value)}
                  placeholder="Search assigned permissions..."
                />

                <DataTable<Permission>
                  columns={[
                    { header: 'ID', accessor: (row) => `#${row.id}` },
                    { header: 'Module', accessor: 'module' },
                    { header: 'Action', accessor: 'action' },
                    {
                      header: 'Description',
                      accessor: (row) => row.description || '-',
                    },
                  ]}
                  data={permissions.filter((permission) =>
                    selectedPermissionIds.includes(permission.id),
                  )}
                  emptyMessage="No permissions assigned to this role"
                />
              </Card>

              <Card title="All Permissions">
                <DataTable<Permission>
                  columns={[
                    { header: 'ID', accessor: (row) => `#${row.id}` },
                    { header: 'Module', accessor: 'module' },
                    { header: 'Action', accessor: 'action' },
                    {
                      header: 'Description',
                      accessor: (row) => row.description || '-',
                    },
                  ]}
                  data={permissions}
                  emptyMessage="No permissions found"
                />
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function SettingsLoading() {
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
              animation: 'settings-spin 0.8s linear infinite',
            }}
          />

          <div>
            <strong style={{ color: '#111827' }}>Loading settings</strong>
            <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: 14 }}>
              Retrieving roles, permissions, RBAC matrix, and system
              configuration from the server.
            </p>
          </div>
        </div>

        <div className="module-grid">
          <div className="module-sidebar">
            {Array.from({ length: 3 }).map((_, cardIndex) => (
              <div
                key={cardIndex}
                style={{
                  minHeight: cardIndex === 1 ? 520 : 220,
                  padding: 18,
                  marginBottom: 16,
                  borderRadius: 14,
                  background: '#ffffff',
                  border: '1px solid #e5e7eb',
                }}
              >
                <Skeleton width="170px" height={18} />

                {Array.from({ length: cardIndex === 1 ? 10 : 5 }).map(
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
                  minHeight: 280,
                  padding: 18,
                  borderRadius: 14,
                  background: '#ffffff',
                  border: '1px solid #e5e7eb',
                }}
              >
                <Skeleton width="180px" height={18} />

                {Array.from({ length: 7 }).map((_, index) => (
                  <Skeleton
                    key={index}
                    width="100%"
                    height={30}
                    marginTop={20}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>

        <style>
          {`
            @keyframes settings-spin {
              to {
                transform: rotate(360deg);
              }
            }

            @keyframes settings-pulse {
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
        animation: 'settings-pulse 1.4s ease-in-out infinite',
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

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: 12,
        borderBottom: '1px solid #f3f4f6',
        paddingBottom: 8,
        marginBottom: 8,
      }}
    >
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function getErrorMessage(error: any, fallback: string) {
  return error?.response?.data?.message || error?.message || fallback;
}

const actionBarStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 8,
  marginBottom: 16,
};

const iconActionButtonStyle: React.CSSProperties = {
  minHeight: 38,
  padding: '8px 12px',
  borderRadius: 10,
  border: '1px solid #dbe3ef',
  background: '#ffffff',
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

const checkboxLabelStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  marginBottom: 12,
};

const permissionPanelStyle: React.CSSProperties = {
  maxHeight: 420,
  overflowY: 'auto',
  marginTop: 12,
};

const moduleLabelStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  fontWeight: 800,
  textTransform: 'capitalize',
  borderBottom: '1px solid #e5e7eb',
  paddingBottom: 8,
};

const permissionLabelStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '8px 0',
  borderBottom: '1px solid #f1f5f9',
};