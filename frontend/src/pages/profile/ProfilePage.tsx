import { useEffect, useState } from 'react';
import { profileApi } from '../../api/profile.api';
import type { ProfileActivity, ProfileUser } from '../../api/profile.api';
import { Button, Card, DataTable, Input, PageHeader } from '../../components/ui';

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileUser | null>(null);
  const [activity, setActivity] = useState<ProfileActivity[]>([]);
  const [loading, setLoading] = useState(false);
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

  async function loadProfile() {
    try {
      setLoading(true);
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
      setMessage(error.response?.data?.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProfile();
  }, []);

  async function updateProfile(e: React.FormEvent) {
    e.preventDefault();

    try {
      setLoading(true);
      setMessage('');

      await profileApi.updateMe(profileForm);
      setMessage('Profile updated successfully');
      await loadProfile();
    } catch (error: any) {
      setMessage(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  }
async function uploadAvatar(file: File) {
  try {
    setLoading(true);
    setMessage('');

    await profileApi.uploadAvatar(file);

    setMessage('Profile image updated successfully');
    await loadProfile();
  } catch (error: any) {
    setMessage(error.response?.data?.message || 'Failed to upload profile image');
  } finally {
    setLoading(false);
  }
}
  async function changePassword(e: React.FormEvent) {
    e.preventDefault();

    try {
      setLoading(true);
      setMessage('');

      await profileApi.changePassword(passwordForm);

      setPasswordForm({
        currentPassword: '',
        newPassword: '',
      });

      setMessage('Password changed successfully');
    } catch (error: any) {
      setMessage(error.response?.data?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem('accessToken');
    window.location.href = '/login';
  }

  const initials = getInitials(profile?.name || profile?.email || 'User');

  return (
    <div>
      <PageHeader
        title="My Profile"
        description="Manage your account, company assignments, project roles, security, and activity history."
      />

      {message && (
        <div
          style={{
            marginBottom: 16,
            padding: 12,
            background: '#f9fafb',
            border: '1px solid #e5e7eb',
            borderRadius: 8,
          }}
        >
          {message}
        </div>
      )}

      {loading && <p>Loading profile...</p>}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
          marginBottom: 20,
        }}
      >
        <Card>
          <ProfileHeader
            initials={initials}
            name={profile?.name || '-'}
            email={profile?.email || '-'}
            jobTitle={profile?.jobTitle || 'No job title'}
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
          <SummaryItem label="User ID" value={profile ? `#${profile.id}` : '-'} />
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
            <form onSubmit={updateProfile}>
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
                  setProfileForm({ ...profileForm, jobTitle: e.target.value })
                }
              />

              <Button disabled={loading} style={{ width: '100%' }}>
                Save Profile
              </Button>
            </form>
          </Card>

          <Card title="Change Password">
            <form onSubmit={changePassword}>
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

              <Button disabled={loading} style={{ width: '100%' }}>
                Change Password
              </Button>
            </form>
          </Card>

<Card title="Profile Image">
  <div style={{ textAlign: 'center' }}>
    {profile?.avatarUrl ? (
      <img
        src={`${import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:5000'}/${profile.avatarUrl.replace(/\\/g, '/')}`}
        alt="Profile"
        style={{
          width: 96,
          height: 96,
          borderRadius: '50%',
          objectFit: 'cover',
          margin: '0 auto 16px',
          border: '3px solid #e5e7eb',
        }}
      />
    ) : (
      <div
        style={{
          width: 96,
          height: 96,
          borderRadius: '50%',
          background: '#111827',
          color: '#ffffff',
          display: 'grid',
          placeItems: 'center',
          fontSize: 32,
          fontWeight: 900,
          margin: '0 auto 16px',
        }}
      >
        {initials}
      </div>
    )}

    <p style={{ color: '#6b7280', fontSize: 14 }}>
      Upload JPG, PNG, or WEBP. Maximum size 5MB.
    </p>

    <input
      type="file"
      accept="image/jpeg,image/png,image/webp"
      onChange={(e) => {
        const file = e.target.files?.[0];

        if (file) {
          uploadAvatar(file);
        }
      }}
    />
  </div>
</Card>

          <Card title="Session">
            <Button variant="danger" onClick={logout} style={{ width: '100%' }}>
              Logout
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
    </div>
  );
}

function ProfileHeader({
  initials,
  name,
  email,
  jobTitle,
}: {
  initials: string;
  name: string;
  email: string;
  jobTitle: string;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: '50%',
          background: '#111827',
          color: '#ffffff',
          display: 'grid',
          placeItems: 'center',
          fontSize: 26,
          fontWeight: 900,
        }}
      >
        {initials}
      </div>

      <div>
        <h2 style={{ margin: 0 }}>{name}</h2>
        <p style={{ margin: '6px 0', color: '#6b7280' }}>{email}</p>
        <strong>{jobTitle}</strong>
      </div>
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
      }}
    >
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
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

function formatDate(value?: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString();
}

function formatDateTime(value?: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleString();
}