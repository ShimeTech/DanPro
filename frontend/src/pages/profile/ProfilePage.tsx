import { useEffect, useState } from 'react';
import { Camera, LogOut, RefreshCcw, Save } from 'lucide-react';

import { profileApi } from '../../api/profile.api';
import type { ProfileActivity, ProfileUser } from '../../api/profile.api';
import { Button, Card, DataTable, Input, PageHeader } from '../../components/ui';

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileUser | null>(null);
  const [activity, setActivity] = useState<ProfileActivity[]>([]);

  const [pageLoading, setPageLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState('');

  const [profileForm, setProfileForm] = useState({
    name: '',
    phone: '',
    jobTitle: '',
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
  });

  const isSuccess = message.toLowerCase().includes('successfully');

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      setPageLoading(true);
      setMessage('');

      const [profileData, activityData] = await Promise.all([
        profileApi.getMe(),
        profileApi.getActivity(),
      ]);

      setProfile(profileData);
      setActivity(activityData);

      setProfileForm({
        name: profileData.name || '',
        phone: profileData.phone || '',
        jobTitle: profileData.jobTitle || '',
      });
    } catch (error: any) {
      setMessage(getErrorMessage(error, 'Failed to load profile'));
    } finally {
      setPageLoading(false);
    }
  }

  async function refreshProfile() {
    try {
      setActionLoading(true);
      setMessage('');

      const [profileData, activityData] = await Promise.all([
        profileApi.getMe(),
        profileApi.getActivity(),
      ]);

      setProfile(profileData);
      setActivity(activityData);

      setProfileForm({
        name: profileData.name || '',
        phone: profileData.phone || '',
        jobTitle: profileData.jobTitle || '',
      });

      setMessage('Profile refreshed successfully');
    } catch (error: any) {
      setMessage(getErrorMessage(error, 'Failed to refresh profile'));
    } finally {
      setActionLoading(false);
    }
  }

  async function updateProfile(e: React.FormEvent) {
    e.preventDefault();

    try {
      setActionLoading(true);
      setMessage('');

      await profileApi.updateMe(profileForm);

      const [profileData, activityData] = await Promise.all([
        profileApi.getMe(),
        profileApi.getActivity(),
      ]);

      setProfile(profileData);
      setActivity(activityData);

      setMessage('Profile updated successfully');
    } catch (error: any) {
      setMessage(getErrorMessage(error, 'Failed to update profile'));
    } finally {
      setActionLoading(false);
    }
  }

  async function uploadAvatar(file: File) {
    try {
      setActionLoading(true);
      setMessage('');

      await profileApi.uploadAvatar(file);

      const [profileData, activityData] = await Promise.all([
        profileApi.getMe(),
        profileApi.getActivity(),
      ]);

      setProfile(profileData);
      setActivity(activityData);

      setMessage('Profile image updated successfully');
    } catch (error: any) {
      setMessage(getErrorMessage(error, 'Failed to upload profile image'));
    } finally {
      setActionLoading(false);
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();

    try {
      setActionLoading(true);
      setMessage('');

      await profileApi.changePassword(passwordForm);

      setPasswordForm({
        currentPassword: '',
        newPassword: '',
      });

      setMessage('Password changed successfully');
    } catch (error: any) {
      setMessage(getErrorMessage(error, 'Failed to change password'));
    } finally {
      setActionLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('authUser');
    window.location.replace('/login');
  }

  const initials = getInitials(profile?.name || profile?.email || 'User');

  return (
    <div>
      <PageHeader
        title="My Profile"
        description="Manage your account, company assignments, project roles, security, and activity history."
      />

      {message && <Alert type={isSuccess ? 'success' : 'error'}>{message}</Alert>}

      {pageLoading ? (
        <ProfileLoading />
      ) : (
        <>
          <div style={actionBarStyle}>
            <IconActionButton
              title="Refresh Profile"
              onClick={refreshProfile}
              disabled={actionLoading}
            >
              <RefreshCcw size={16} /> Refresh
            </IconActionButton>
          </div>

          <div style={summaryGridStyle}>
            <Card>
              <ProfileHeader
                initials={initials}
                name={profile?.name || '-'}
                email={profile?.email || '-'}
                jobTitle={profile?.jobTitle || 'No job title'}
                avatarUrl={profile?.avatarUrl}
              />
            </Card>

            <Card>
              <SummaryItem label="Status" value={profile?.status || '-'} />
              <SummaryItem
                label="Companies"
                value={String(profile?.companyUsers?.length ?? 0)}
              />
              <SummaryItem
                label="Projects"
                value={String(profile?.projectUsers?.length ?? 0)}
              />
            </Card>

            <Card>
              <SummaryItem
                label="User ID"
                value={profile ? `#${profile.id}` : '-'}
              />
              <SummaryItem label="Phone" value={profile?.phone || '-'} />
              <SummaryItem
                label="Joined"
                value={profile?.createdAt ? formatDate(profile.createdAt) : '-'}
              />
            </Card>
          </div>

          <div className="module-grid">
            <div className="module-sidebar">
              <Card title="Edit Profile">
                <form onSubmit={updateProfile} aria-busy={actionLoading}>
                  <Input
                    label="Full Name"
                    value={profileForm.name}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, name: e.target.value })
                    }
                    required
                  />

                  <Input
                    label="Phone"
                    value={profileForm.phone}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, phone: e.target.value })
                    }
                  />

                  <Input
                    label="Job Title"
                    value={profileForm.jobTitle}
                    onChange={(e) =>
                      setProfileForm({
                        ...profileForm,
                        jobTitle: e.target.value,
                      })
                    }
                  />

                  <Button disabled={actionLoading} style={{ width: '100%' }}>
                    {actionLoading ? (
                      'Saving...'
                    ) : (
                      <>
                        <Save size={15} /> Save Profile
                      </>
                    )}
                  </Button>
                </form>
              </Card>

              <Card title="Change Password">
                <form onSubmit={changePassword} aria-busy={actionLoading}>
                  <Input
                    label="Current Password"
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(e) =>
                      setPasswordForm({
                        ...passwordForm,
                        currentPassword: e.target.value,
                      })
                    }
                    required
                  />

                  <Input
                    label="New Password"
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) =>
                      setPasswordForm({
                        ...passwordForm,
                        newPassword: e.target.value,
                      })
                    }
                    required
                  />

                  <Button disabled={actionLoading} style={{ width: '100%' }}>
                    {actionLoading ? 'Saving...' : 'Change Password'}
                  </Button>
                </form>
              </Card>

              <Card title="Profile Image">
                <div style={{ textAlign: 'center' }}>
                  <Avatar
                    initials={initials}
                    avatarUrl={profile?.avatarUrl}
                    size={96}
                  />

                  <p style={{ color: '#6b7280', fontSize: 14 }}>
                    Upload JPG, PNG, or WEBP. Maximum size 5MB.
                  </p>

                  <label style={uploadLabelStyle}>
                    <Camera size={15} />
                    {actionLoading ? 'Uploading...' : 'Upload Image'}

                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      disabled={actionLoading}
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];

                        if (file) {
                          uploadAvatar(file);
                        }

                        e.target.value = '';
                      }}
                    />
                  </label>
                </div>
              </Card>

              <Card title="Session">
                <Button
                  variant="danger"
                  onClick={logout}
                  disabled={actionLoading}
                  style={{ width: '100%' }}
                >
                  <LogOut size={15} /> Logout
                </Button>
              </Card>
            </div>

            <div className="module-content">
              <Card title="Company Assignments">
                <DataTable
                  columns={[
                    {
                      header: 'Company',
                      accessor: (row: any) => row.company?.name || '-',
                    },
                    {
                      header: 'Role',
                      accessor: (row: any) => row.role?.name || '-',
                    },
                    {
                      header: 'Status',
                      accessor: 'status',
                    },
                    {
                      header: 'Email',
                      accessor: (row: any) => row.company?.email || '-',
                    },
                  ]}
                  data={profile?.companyUsers ?? []}
                  emptyMessage="No company assignments found"
                />
              </Card>

              <Card title="Project Assignments">
                <DataTable
                  columns={[
                    {
                      header: 'Project',
                      accessor: (row: any) =>
                        row.project
                          ? `${row.project.code} - ${row.project.name}`
                          : '-',
                    },
                    {
                      header: 'Role',
                      accessor: (row: any) => row.role?.name || '-',
                    },
                    {
                      header: 'Status',
                      accessor: 'status',
                    },
                    {
                      header: 'Location',
                      accessor: (row: any) => row.project?.location || '-',
                    },
                  ]}
                  data={profile?.projectUsers ?? []}
                  emptyMessage="No project assignments found"
                />
              </Card>

              <Card title="Recent Activity">
                <DataTable<ProfileActivity>
                  columns={[
                    {
                      header: 'Date',
                      accessor: (row) => formatDateTime(row.createdAt),
                    },
                    {
                      header: 'Action',
                      accessor: 'action',
                    },
                    {
                      header: 'Module',
                      accessor: 'module',
                    },
                    {
                      header: 'Entity',
                      accessor: (row) =>
                        `${row.entityName}${row.entityId ? ` #${row.entityId}` : ''}`,
                    },
                    {
                      header: 'Project',
                      accessor: (row) => row.project?.name || '-',
                    },
                    {
                      header: 'Description',
                      accessor: (row) => row.description || '-',
                    },
                  ]}
                  data={activity}
                  emptyMessage="No activity found"
                />
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ProfileLoading() {
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
              animation: 'profile-spin 0.8s linear infinite',
            }}
          />

          <div>
            <strong style={{ color: '#111827' }}>Loading profile</strong>

            <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: 14 }}>
              Retrieving account details, company assignments, project roles,
              profile image, security settings, and recent activity.
            </p>
          </div>
        </div>

        <div style={summaryGridStyle}>
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} style={loadingCardStyle}>
              <Skeleton width="60%" height={18} />
              <Skeleton width="90%" height={28} marginTop={16} />
              <Skeleton width="70%" height={18} marginTop={14} />
            </div>
          ))}
        </div>

        <div className="module-grid">
          <div className="module-sidebar">
            {Array.from({ length: 4 }).map((_, cardIndex) => (
              <div
                key={cardIndex}
                style={{
                  minHeight: cardIndex === 2 ? 220 : 190,
                  padding: 18,
                  marginBottom: 16,
                  borderRadius: 14,
                  background: '#ffffff',
                  border: '1px solid #e5e7eb',
                }}
              >
                <Skeleton width="170px" height={18} />

                {Array.from({ length: cardIndex === 2 ? 4 : 3 }).map(
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

          <div style={{ display: 'grid', gap: 20 }}>
            {Array.from({ length: 3 }).map((_, cardIndex) => (
              <div
                key={cardIndex}
                style={{
                  minHeight: 260,
                  padding: 18,
                  borderRadius: 14,
                  background: '#ffffff',
                  border: '1px solid #e5e7eb',
                }}
              >
                <Skeleton width="190px" height={18} />

                {Array.from({ length: 6 }).map((_, index) => (
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
            @keyframes profile-spin {
              to {
                transform: rotate(360deg);
              }
            }

            @keyframes profile-pulse {
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
        animation: 'profile-pulse 1.4s ease-in-out infinite',
      }}
    />
  );
}

function ProfileHeader({
  initials,
  name,
  email,
  jobTitle,
  avatarUrl,
}: {
  initials: string;
  name: string;
  email: string;
  jobTitle: string;
  avatarUrl?: string | null;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <Avatar initials={initials} avatarUrl={avatarUrl} size={72} />

      <div>
        <h2 style={{ margin: 0 }}>{name}</h2>
        <p style={{ margin: '6px 0', color: '#6b7280' }}>{email}</p>
        <strong>{jobTitle}</strong>
      </div>
    </div>
  );
}

function Avatar({
  initials,
  avatarUrl,
  size,
}: {
  initials: string;
  avatarUrl?: string | null;
  size: number;
}) {
  if (avatarUrl) {
    return (
      <img
        src={getFileUrl(avatarUrl)}
        alt="Profile"
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          objectFit: 'cover',
          margin: size === 96 ? '0 auto 16px' : undefined,
          border: '3px solid #e5e7eb',
          display: 'block',
        }}
      />
    );
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: '#111827',
        color: '#ffffff',
        display: 'grid',
        placeItems: 'center',
        fontSize: size >= 96 ? 32 : 26,
        fontWeight: 900,
        margin: size === 96 ? '0 auto 16px' : undefined,
      }}
    >
      {initials}
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        borderBottom: '1px solid #f3f4f6',
        paddingBottom: 8,
        marginBottom: 8,
        gap: 12,
      }}
    >
      <span>{label}</span>
      <strong style={{ textAlign: 'right' }}>{value}</strong>
    </div>
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

function getInitials(value: string) {
  return value
    .split(/[ @.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function getFileUrl(path?: string | null) {
  if (!path) return '';

  if (path.startsWith('http')) return path;

  const apiUrl =
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_API_URL ||
    'http://localhost:5000/api';

  const baseUrl = apiUrl.replace('/api', '');
  const cleanPath = path.replace(/\\/g, '/').replace(/^\/+/, '');

  return `${baseUrl}/${cleanPath}`;
}

function formatDate(value?: string | null) {
  if (!value) return '-';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '-';

  return date.toLocaleDateString();
}

function formatDateTime(value?: string | null) {
  if (!value) return '-';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '-';

  return date.toLocaleString();
}

function getErrorMessage(error: any, fallback: string) {
  return error?.response?.data?.message || error?.message || fallback;
}

const summaryGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: 16,
  marginBottom: 20,
};

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

const uploadLabelStyle: React.CSSProperties = {
  minHeight: 38,
  padding: '8px 12px',
  borderRadius: 10,
  border: '1px solid #dbe3ef',
  background: '#ffffff',
  color: '#1e293b',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  fontWeight: 700,
  cursor: 'pointer',
};

const loadingCardStyle: React.CSSProperties = {
  background: '#ffffff',
  border: '1px solid #e5e7eb',
  borderRadius: 12,
  padding: 16,
};