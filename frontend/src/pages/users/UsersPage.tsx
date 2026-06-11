import { useEffect, useState } from 'react';

import { companiesApi } from '../../api/companies.api';
import type { Company } from '../../api/companies.api';
import { projectsApi } from '../../api/projects.api';
import type { Project } from '../../api/projects.api';
import { settingsApi } from '../../api/settings.api';
import type { Role } from '../../api/settings.api';
import { usersApi } from '../../api/users.api';
import type { User } from '../../api/users.api';

import PermissionGuard from '../../components/auth/PermissionGuard';
import { Button, Card, DataTable, Input, PageHeader } from '../../components/ui';

const emptyCreateForm = {
  name: '',
  email: '',
  password: '123456',
  phone: '',
  jobTitle: '',
  employeeId: '',
  department: '',
  employmentType: 'FULL_TIME',
  gender: '',
  nationality: '',
  address: '',
  emergencyName: '',
  emergencyPhone: '',
  educationLevel: '',
  fieldOfStudy: '',
  institution: '',
  graduationYear: '',
  yearsExperience: '',
  previousCompany: '',
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);

  const [editingUser, setEditingUser] = useState<User | null>(null);

  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    jobTitle: '',
    status: 'ACTIVE',
  });

  const [createForm, setCreateForm] = useState(emptyCreateForm);

  const [companyForm, setCompanyForm] = useState({
    companyId: '',
    userId: '',
    roleId: '',
    status: 'ACTIVE',
  });

  const [projectForm, setProjectForm] = useState({
    projectId: '',
    userId: '',
    roleId: '',
    status: 'ACTIVE',
  });

  const [pageLoading, setPageLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState('');

  const isSuccess = message.toLowerCase().includes('successfully');

  useEffect(() => {
    loadData({ initialLoad: true, clearMessage: true });
  }, []);

  async function loadData(options?: {
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

      const [userData, companyData, projectData, roleData] = await Promise.all([
        usersApi.findAll(),
        companiesApi.findAll(),
        projectsApi.findAll(),
        settingsApi.findRoles(),
      ]);

      setUsers(userData);
      setCompanies(companyData);
      setProjects(projectData);
      setRoles(roleData);
    } catch (error: any) {
      setMessage(error.response?.data?.message || 'Failed to load users data');
    } finally {
      if (options?.initialLoad) {
        setPageLoading(false);
      }
    }
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();

    try {
      setActionLoading(true);
      setMessage('');

      await usersApi.create({
        ...createForm,
        graduationYear: createForm.graduationYear
          ? Number(createForm.graduationYear)
          : undefined,
        yearsExperience: createForm.yearsExperience
          ? Number(createForm.yearsExperience)
          : undefined,
      });

      setMessage('Employee user created successfully');
      setCreateForm(emptyCreateForm);

      await loadData();
    } catch (error: any) {
      setMessage(
        error.response?.data?.message || 'Failed to create employee user',
      );
    } finally {
      setActionLoading(false);
    }
  }

  function handleEdit(user: User) {
    setEditingUser(user);

    setEditForm({
      name: user.name || '',
      email: user.email || '',
      phone: user.phone || '',
      jobTitle: user.jobTitle || '',
      status: user.status || 'ACTIVE',
    });

    setMessage('');
  }

  function handleCancelEdit() {
    setEditingUser(null);
    setMessage('');
  }

  async function handleUpdateUser(e: React.FormEvent) {
    e.preventDefault();

    if (!editingUser) return;

    try {
      setActionLoading(true);
      setMessage('');

      await usersApi.update(editingUser.id, {
        name: editForm.name,
        email: editForm.email,
        phone: editForm.phone,
        jobTitle: editForm.jobTitle,
        status: editForm.status,
      });

      setMessage('User updated successfully');
      setEditingUser(null);

      await loadData();
    } catch (error: any) {
      setMessage(error.response?.data?.message || 'Failed to update user');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDeactivate(id: number) {
    const confirmed = window.confirm(
      'Are you sure you want to deactivate this user?',
    );

    if (!confirmed) return;

    try {
      setActionLoading(true);
      setMessage('');

      await usersApi.remove(id);

      setMessage('User deactivated successfully');
      await loadData();
    } catch (error: any) {
      setMessage(error.response?.data?.message || 'Failed to deactivate user');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleActivate(id: number) {
    const confirmed = window.confirm('Activate this user?');

    if (!confirmed) return;

    try {
      setActionLoading(true);
      setMessage('');

      await usersApi.activate(id);

      setMessage('User activated successfully');
      await loadData();
    } catch (error: any) {
      setMessage(error.response?.data?.message || 'Failed to activate user');
    } finally {
      setActionLoading(false);
    }
  }

  async function handlePermanentDelete(id: number) {
    const confirmed = window.confirm(
      'This will permanently delete the user. This action cannot be undone.',
    );

    if (!confirmed) return;

    try {
      setActionLoading(true);
      setMessage('');

      await usersApi.permanentDelete(id);

      setMessage('User deleted successfully');
      await loadData();
    } catch (error: any) {
      setMessage(error.response?.data?.message || 'Failed to delete user');
    } finally {
      setActionLoading(false);
    }
  }

  async function assignCompanyUser(e: React.FormEvent) {
    e.preventDefault();

    if (!companyForm.companyId || !companyForm.userId || !companyForm.roleId) {
      setMessage('Select company, user, and role first');
      return;
    }

    try {
      setActionLoading(true);
      setMessage('');

      await usersApi.assignToCompany(Number(companyForm.companyId), {
        userId: Number(companyForm.userId),
        roleId: Number(companyForm.roleId),
        status: companyForm.status as 'ACTIVE' | 'INACTIVE',
      });

      setMessage('User assigned to company successfully');
      setCompanyForm({
        companyId: '',
        userId: '',
        roleId: '',
        status: 'ACTIVE',
      });

      await loadData();
    } catch (error: any) {
      setMessage(
        error.response?.data?.message || 'Failed to assign user to company',
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function assignProjectUser(e: React.FormEvent) {
    e.preventDefault();

    if (!projectForm.projectId || !projectForm.userId || !projectForm.roleId) {
      setMessage('Select project, user, and role first');
      return;
    }

    try {
      setActionLoading(true);
      setMessage('');

      await usersApi.assignToProject(Number(projectForm.projectId), {
        userId: Number(projectForm.userId),
        roleId: Number(projectForm.roleId),
        status: projectForm.status as 'ACTIVE' | 'INACTIVE',
      });

      setMessage('User assigned to project successfully');
      setProjectForm({
        projectId: '',
        userId: '',
        roleId: '',
        status: 'ACTIVE',
      });

      await loadData();
    } catch (error: any) {
      setMessage(
        error.response?.data?.message || 'Failed to assign user to project',
      );
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Users Management"
        description="Manage users, roles, company assignments, and project assignments."
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
        <UsersLoading />
      ) : (
        <>
          {editingUser && (
            <Card title={`Edit User: ${editingUser.name}`}>
              <form onSubmit={handleUpdateUser} aria-busy={actionLoading}>
                <div className="module-grid">
                  <Input
                    label="Full Name"
                    value={editForm.name}
                    onChange={(e) =>
                      setEditForm({ ...editForm, name: e.target.value })
                    }
                    required
                  />

                  <Input
                    label="Email"
                    type="email"
                    value={editForm.email}
                    onChange={(e) =>
                      setEditForm({ ...editForm, email: e.target.value })
                    }
                    required
                  />

                  <Input
                    label="Phone"
                    value={editForm.phone}
                    onChange={(e) =>
                      setEditForm({ ...editForm, phone: e.target.value })
                    }
                  />

                  <Input
                    label="Job Title"
                    value={editForm.jobTitle}
                    onChange={(e) =>
                      setEditForm({ ...editForm, jobTitle: e.target.value })
                    }
                  />

                  <SelectField
                    label="User Status"
                    value={editForm.status}
                    disabled={actionLoading}
                    onChange={(value) =>
                      setEditForm({ ...editForm, status: value })
                    }
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </SelectField>
                </div>

                <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                  <PermissionGuard permissions={['users:update']}>
                    <Button type="submit" disabled={actionLoading}>
                      {actionLoading ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </PermissionGuard>

                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleCancelEdit}
                    disabled={actionLoading}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Card>
          )}

          <div className="module-grid" style={{ marginTop: 20 }}>
            <div className="module-sidebar">
              <PermissionGuard permissions={['users:create']}>
                <Card title="Create Employee User">
                  <form onSubmit={handleCreateUser} aria-busy={actionLoading}>
                    <Input
                      label="Full Name"
                      value={createForm.name}
                      onChange={(e) =>
                        setCreateForm({
                          ...createForm,
                          name: e.target.value,
                        })
                      }
                      required
                    />

                    <Input
                      label="Email"
                      type="email"
                      value={createForm.email}
                      onChange={(e) =>
                        setCreateForm({
                          ...createForm,
                          email: e.target.value,
                        })
                      }
                      required
                    />

                    <Input
                      label="Temporary Password"
                      type="password"
                      value={createForm.password}
                      onChange={(e) =>
                        setCreateForm({
                          ...createForm,
                          password: e.target.value,
                        })
                      }
                      required
                    />

                    <Input
                      label="Employee ID"
                      value={createForm.employeeId}
                      onChange={(e) =>
                        setCreateForm({
                          ...createForm,
                          employeeId: e.target.value,
                        })
                      }
                    />

                    <Input
                      label="Phone"
                      value={createForm.phone}
                      onChange={(e) =>
                        setCreateForm({
                          ...createForm,
                          phone: e.target.value,
                        })
                      }
                    />

                    <Input
                      label="Job Title"
                      value={createForm.jobTitle}
                      onChange={(e) =>
                        setCreateForm({
                          ...createForm,
                          jobTitle: e.target.value,
                        })
                      }
                    />

                    <Input
                      label="Department"
                      value={createForm.department}
                      onChange={(e) =>
                        setCreateForm({
                          ...createForm,
                          department: e.target.value,
                        })
                      }
                    />

                    <SelectField
                      label="Employment Type"
                      value={createForm.employmentType}
                      disabled={actionLoading}
                      onChange={(value) =>
                        setCreateForm({
                          ...createForm,
                          employmentType: value,
                        })
                      }
                    >
                      <option value="FULL_TIME">Full Time</option>
                      <option value="PART_TIME">Part Time</option>
                      <option value="CONTRACT">Contract</option>
                      <option value="INTERN">Intern</option>
                    </SelectField>

                    <SelectField
                      label="Gender"
                      value={createForm.gender}
                      disabled={actionLoading}
                      onChange={(value) =>
                        setCreateForm({ ...createForm, gender: value })
                      }
                    >
                      <option value="">Select gender</option>
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                    </SelectField>

                    <Input
                      label="Nationality"
                      value={createForm.nationality}
                      onChange={(e) =>
                        setCreateForm({
                          ...createForm,
                          nationality: e.target.value,
                        })
                      }
                    />

                    <Input
                      label="Address"
                      value={createForm.address}
                      onChange={(e) =>
                        setCreateForm({
                          ...createForm,
                          address: e.target.value,
                        })
                      }
                    />

                    <Input
                      label="Emergency Contact Name"
                      value={createForm.emergencyName}
                      onChange={(e) =>
                        setCreateForm({
                          ...createForm,
                          emergencyName: e.target.value,
                        })
                      }
                    />

                    <Input
                      label="Emergency Contact Phone"
                      value={createForm.emergencyPhone}
                      onChange={(e) =>
                        setCreateForm({
                          ...createForm,
                          emergencyPhone: e.target.value,
                        })
                      }
                    />

                    <Input
                      label="Education Level"
                      value={createForm.educationLevel}
                      onChange={(e) =>
                        setCreateForm({
                          ...createForm,
                          educationLevel: e.target.value,
                        })
                      }
                    />

                    <Input
                      label="Field of Study"
                      value={createForm.fieldOfStudy}
                      onChange={(e) =>
                        setCreateForm({
                          ...createForm,
                          fieldOfStudy: e.target.value,
                        })
                      }
                    />

                    <Input
                      label="Institution"
                      value={createForm.institution}
                      onChange={(e) =>
                        setCreateForm({
                          ...createForm,
                          institution: e.target.value,
                        })
                      }
                    />

                    <Input
                      label="Graduation Year"
                      type="number"
                      value={createForm.graduationYear}
                      onChange={(e) =>
                        setCreateForm({
                          ...createForm,
                          graduationYear: e.target.value,
                        })
                      }
                    />

                    <Input
                      label="Years of Experience"
                      type="number"
                      value={createForm.yearsExperience}
                      onChange={(e) =>
                        setCreateForm({
                          ...createForm,
                          yearsExperience: e.target.value,
                        })
                      }
                    />

                    <Input
                      label="Previous Company"
                      value={createForm.previousCompany}
                      onChange={(e) =>
                        setCreateForm({
                          ...createForm,
                          previousCompany: e.target.value,
                        })
                      }
                    />

                    <Button
                      type="submit"
                      disabled={actionLoading}
                      style={{ width: '100%' }}
                    >
                      {actionLoading ? 'Creating...' : 'Create Employee User'}
                    </Button>
                  </form>
                </Card>
              </PermissionGuard>

              <Card title="Assign User to Company">
                <form onSubmit={assignCompanyUser} aria-busy={actionLoading}>
                  <SelectField
                    label="Company"
                    value={companyForm.companyId}
                    disabled={actionLoading}
                    onChange={(value) =>
                      setCompanyForm({ ...companyForm, companyId: value })
                    }
                  >
                    <option value="">Select company</option>
                    {companies.map((company) => (
                      <option key={company.id} value={company.id}>
                        {company.name}
                      </option>
                    ))}
                  </SelectField>

                  <SelectField
                    label="User"
                    value={companyForm.userId}
                    disabled={actionLoading}
                    onChange={(value) =>
                      setCompanyForm({ ...companyForm, userId: value })
                    }
                  >
                    <option value="">Select user</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name} - {user.email}
                      </option>
                    ))}
                  </SelectField>

                  <SelectField
                    label="Role"
                    value={companyForm.roleId}
                    disabled={actionLoading}
                    onChange={(value) =>
                      setCompanyForm({ ...companyForm, roleId: value })
                    }
                  >
                    <option value="">Select role</option>
                    {roles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))}
                  </SelectField>

                  <PermissionGuard permissions={['users:assign']}>
                    <Button
                      type="submit"
                      disabled={actionLoading}
                      style={{ width: '100%' }}
                    >
                      {actionLoading ? 'Assigning...' : 'Assign User to Company'}
                    </Button>
                  </PermissionGuard>
                </form>
              </Card>

              <Card title="Assign User to Project">
                <form onSubmit={assignProjectUser} aria-busy={actionLoading}>
                  <SelectField
                    label="Project"
                    value={projectForm.projectId}
                    disabled={actionLoading}
                    onChange={(value) =>
                      setProjectForm({ ...projectForm, projectId: value })
                    }
                  >
                    <option value="">Select project</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.code} - {project.name}
                      </option>
                    ))}
                  </SelectField>

                  <SelectField
                    label="User"
                    value={projectForm.userId}
                    disabled={actionLoading}
                    onChange={(value) =>
                      setProjectForm({ ...projectForm, userId: value })
                    }
                  >
                    <option value="">Select user</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name} - {user.email}
                      </option>
                    ))}
                  </SelectField>

                  <SelectField
                    label="Role"
                    value={projectForm.roleId}
                    disabled={actionLoading}
                    onChange={(value) =>
                      setProjectForm({ ...projectForm, roleId: value })
                    }
                  >
                    <option value="">Select role</option>
                    {roles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))}
                  </SelectField>

                  <PermissionGuard permissions={['users:assign']}>
                    <Button
                      type="submit"
                      disabled={actionLoading}
                      style={{ width: '100%' }}
                    >
                      {actionLoading ? 'Assigning...' : 'Assign User to Project'}
                    </Button>
                  </PermissionGuard>
                </form>
              </Card>
            </div>

            <div className="module-content">
              <Card title="User List">
                <DataTable<User>
                  columns={[
                    { header: 'ID', accessor: (row) => `#${row.id}` },
                    { header: 'Name', accessor: 'name' },
                    { header: 'Email', accessor: 'email' },
                    { header: 'Phone', accessor: (row) => row.phone || '-' },
                    {
                      header: 'Job Title',
                      accessor: (row) => row.jobTitle || '-',
                    },
                    {
                      header: 'Status',
                      accessor: (row) => (
                        <span
                          style={{
                            color:
                              row.status === 'ACTIVE' ? '#15803d' : '#991b1b',
                            fontWeight: 700,
                          }}
                        >
                          {row.status}
                        </span>
                      ),
                    },
                    {
                      header: 'Actions',
                      accessor: (row) => (
                        <div
                          style={{
                            display: 'flex',
                            gap: 8,
                            flexWrap: 'wrap',
                          }}
                        >
                          <PermissionGuard permissions={['users:update']}>
                            <Button
                              variant="secondary"
                              onClick={() => handleEdit(row)}
                              disabled={actionLoading}
                              style={{ padding: '6px 10px' }}
                            >
                              Edit
                            </Button>
                          </PermissionGuard>

                          {row.status === 'ACTIVE' ? (
                            <PermissionGuard permissions={['users:delete']}>
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
                            <>
                              <PermissionGuard permissions={['users:update']}>
                                <Button
                                  onClick={() => handleActivate(row.id)}
                                  disabled={actionLoading}
                                  style={{ padding: '6px 10px' }}
                                >
                                  Activate
                                </Button>
                              </PermissionGuard>

                              <PermissionGuard permissions={['users:delete']}>
                                <Button
                                  variant="danger"
                                  onClick={() => handlePermanentDelete(row.id)}
                                  disabled={actionLoading}
                                  style={{ padding: '6px 10px' }}
                                >
                                  Delete
                                </Button>
                              </PermissionGuard>
                            </>
                          )}
                        </div>
                      ),
                    },
                  ]}
                  data={users}
                  emptyMessage="No users found"
                />
              </Card>

              <Card title="Available Roles">
                <DataTable<Role>
                  columns={[
                    { header: 'ID', accessor: (row) => `#${row.id}` },
                    { header: 'Role', accessor: 'name' },
                    {
                      header: 'Description',
                      accessor: (row) => row.description || '-',
                    },
                    {
                      header: 'System',
                      accessor: (row) => (row.isSystem ? 'Yes' : 'No'),
                    },
                  ]}
                  data={roles}
                  emptyMessage="No roles found"
                />
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function UsersLoading() {
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
              animation: 'users-spin 0.8s linear infinite',
            }}
          />

          <div>
            <strong style={{ color: '#111827' }}>Loading users</strong>

            <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: 14 }}>
              Retrieving users, companies, projects, and roles from the server.
              Please wait.
            </p>
          </div>
        </div>

        <div className="module-grid" style={{ marginTop: 20 }}>
          <div className="module-sidebar">
            {Array.from({ length: 3 }).map((_, cardIndex) => (
              <div
                key={cardIndex}
                style={{
                  minHeight: cardIndex === 0 ? 620 : 220,
                  padding: 18,
                  marginBottom: 16,
                  borderRadius: 14,
                  background: '#ffffff',
                  border: '1px solid #e5e7eb',
                }}
              >
                <Skeleton width="180px" height={18} />

                {Array.from({ length: cardIndex === 0 ? 12 : 4 }).map(
                  (_, index) => (
                    <Skeleton
                      key={index}
                      width="100%"
                      height={34}
                      marginTop={18}
                    />
                  ),
                )}
              </div>
            ))}
          </div>

          <div className="module-content">
            <div
              style={{
                minHeight: 420,
                padding: 18,
                marginBottom: 16,
                borderRadius: 14,
                background: '#ffffff',
                border: '1px solid #e5e7eb',
              }}
            >
              <Skeleton width="160px" height={18} />

              {Array.from({ length: 8 }).map((_, index) => (
                <Skeleton
                  key={index}
                  width="100%"
                  height={30}
                  marginTop={20}
                />
              ))}
            </div>

            <div
              style={{
                minHeight: 260,
                padding: 18,
                borderRadius: 14,
                background: '#ffffff',
                border: '1px solid #e5e7eb',
              }}
            >
              <Skeleton width="150px" height={18} />

              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton
                  key={index}
                  width={`${76 + (index % 2) * 20}%`}
                  height={28}
                  marginTop={20}
                />
              ))}
            </div>
          </div>
        </div>

        <style>
          {`
            @keyframes users-spin {
              to {
                transform: rotate(360deg);
              }
            }

            @keyframes users-pulse {
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
        animation: 'users-pulse 1.4s ease-in-out infinite',
      }}
    />
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
          width: '100%',
          padding: '10px 12px',
          borderRadius: 8,
          border: '1px solid #d1d5db',
          background: disabled ? '#f3f4f6' : '#ffffff',
          cursor: disabled ? 'not-allowed' : 'pointer',
        }}
      >
        {children}
      </select>
    </div>
  );
}