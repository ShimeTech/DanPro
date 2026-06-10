import { useEffect, useMemo, useState } from 'react';
import { Edit, Save, Search, ShieldCheck, Trash2, X } from 'lucide-react';
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
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<number[]>(
    [],
  );
  const [permissionSearch, setPermissionSearch] = useState('');
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [roleForm, setRoleForm] = useState(emptyRoleForm);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const selectedRole = roles.find((role) => role.id === Number(selectedRoleId));

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
    loadSettings();
  }, []);

  useEffect(() => {
    const role = roles.find((item) => item.id === Number(selectedRoleId));

    setSelectedPermissionIds(
      role?.rolePermissions?.map((item) => item.permissionId) ?? [],
    );
  }, [selectedRoleId, roles]);

  async function loadSettings() {
    try {
      setLoading(true);
      setMessage('');

      const [roleData, permissionData] = await Promise.all([
        settingsApi.findRoles(),
        settingsApi.findPermissions(),
      ]);

      setRoles(roleData);
      setPermissions(permissionData);

      if (roleData.length > 0 && !selectedRoleId) {
        setSelectedRoleId(roleData[0].id);
      }
    } catch (error: any) {
      setMessage(error.response?.data?.message || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }

  async function saveRole(e: React.FormEvent) {
    e.preventDefault();

    try {
      setLoading(true);
      setMessage('');

      if (editingRole) {
        await settingsApi.updateRole(editingRole.id, roleForm);
        setMessage('Role updated successfully');
      } else {
        await settingsApi.createRole(roleForm);
        setMessage('Role created successfully');
      }

      resetRoleForm();
      await loadSettings();
    } catch (error: any) {
      setMessage(error.response?.data?.message || 'Failed to save role');
    } finally {
      setLoading(false);
    }
  }

  function editRole(role: Role) {
    setEditingRole(role);
    setRoleForm({
      name: role.name,
      description: role.description || '',
      isSystem: role.isSystem,
    });
  }

  async function deleteRole(role: Role) {
    if (role.isSystem) {
      setMessage('System roles cannot be deleted');
      return;
    }

    if (!window.confirm(`Delete role "${role.name}"?`)) return;

    try {
      setLoading(true);
      setMessage('');

      await settingsApi.removeRole(role.id);

      setMessage('Role deleted successfully');
      await loadSettings();
    } catch (error: any) {
      setMessage(error.response?.data?.message || 'Failed to delete role');
    } finally {
      setLoading(false);
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
      setLoading(true);
      setMessage('');

      await settingsApi.syncPermissions(
        Number(selectedRoleId),
        selectedPermissionIds,
      );

      setMessage('Permissions updated successfully');
      await loadSettings();
    } catch (error: any) {
      setMessage(error.response?.data?.message || 'Failed to update permissions');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Manage roles, permissions, RBAC access control, and system configuration."
      />

      {message && (
        <div
          style={{
            marginBottom: 16,
            padding: 12,
            background: message.toLowerCase().includes('success')
              ? '#dcfce7'
              : '#fee2e2',
            color: message.toLowerCase().includes('success')
              ? '#166534'
              : '#991b1b',
            border: '1px solid #e5e7eb',
            borderRadius: 8,
            fontWeight: 600,
          }}
        >
          {message}
        </div>
      )}

      <div className="module-grid">
        <div className="module-sidebar">
          <Card title={editingRole ? 'Edit Role' : 'Create Role'}>
            <form onSubmit={saveRole}>
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
                onChange={(value) =>
                  setRoleForm({ ...roleForm, description: value })
                }
              />

              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 12,
                }}
              >
                <input
                  type="checkbox"
                  checked={roleForm.isSystem}
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
                <Button disabled={loading} style={{ flex: 1 }}>
                  {editingRole ? (
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
              onChange={(value) => setSelectedRoleId(value ? Number(value) : '')}
            >
              <option value="">Select role</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </SelectField>

            <Input
              label="Search Permissions"
              value={permissionSearch}
              onChange={(e) => setPermissionSearch(e.target.value)}
              placeholder="Search module, action, description..."
            />

            <div style={{ maxHeight: 420, overflowY: 'auto', marginTop: 12 }}>
              {groupedPermissions.map(([module, modulePermissions]) => {
                const modulePermissionIds = modulePermissions.map(
                  (item) => item.id,
                );
                const allSelected = modulePermissionIds.every((id) =>
                  selectedPermissionIds.includes(id),
                );

                return (
                  <div key={module} style={{ marginBottom: 18 }}>
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        fontWeight: 800,
                        textTransform: 'capitalize',
                        borderBottom: '1px solid #e5e7eb',
                        paddingBottom: 8,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={() => toggleModulePermissions(modulePermissions)}
                      />
                      {module}
                    </label>

                    {modulePermissions.map((permission) => (
                      <label
                        key={permission.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '8px 0',
                          borderBottom: '1px solid #f1f5f9',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedPermissionIds.includes(permission.id)}
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
              disabled={loading || !selectedRoleId}
              onClick={savePermissionMatrix}
              style={{ width: '100%', marginTop: 12 }}
            >
              <ShieldCheck size={15} /> Save Permissions
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
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => editRole(row)}
                        style={{ padding: '6px 10px' }}
                      >
                        <Edit size={14} />
                      </Button>

                      <Button
                        type="button"
                        variant="danger"
                        onClick={() => deleteRole(row)}
                        disabled={row.isSystem}
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
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>
        {label}
      </label>

      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%',
          padding: '10px 12px',
          borderRadius: 8,
          border: '1px solid #d1d5db',
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
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>
        {label}
      </label>

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        style={{
          width: '100%',
          padding: '10px 12px',
          borderRadius: 8,
          border: '1px solid #d1d5db',
          resize: 'vertical',
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