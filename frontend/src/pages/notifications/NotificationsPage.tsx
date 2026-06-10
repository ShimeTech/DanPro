import { useEffect, useMemo, useState } from 'react';
import {
  Bell,
  CheckCircle2,
  Edit,
  Eye,
  MailOpen,
  RefreshCcw,
  Save,
  Trash2,
  X,
} from 'lucide-react';

import { notificationsApi } from '../../api/notifications.api';
import type { NotificationItem } from '../../api/notifications.api';

import { contactApi } from '../../api/contact.api';
import type { ContactNotification } from '../../api/contact.api';

import { projectsApi } from '../../api/projects.api';
import type { Project } from '../../api/projects.api';

import { usersApi } from '../../api/users.api';
import type { User } from '../../api/users.api';

import { Button, Card, DataTable, Input, PageHeader } from '../../components/ui';

const notificationTypes = [
  'INFO',
  'SUCCESS',
  'WARNING',
  'ERROR',
  'APPROVAL',
  'DEADLINE',
];

const emptyForm = {
  userId: '',
  projectId: '',
  type: 'INFO',
  title: '',
  message: '',
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [contactInquiries, setContactInquiries] = useState<ContactNotification[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState<NotificationItem | null>(null);
  const [viewing, setViewing] = useState<NotificationItem | null>(null);
  const [viewingContact, setViewingContact] = useState<ContactNotification | null>(null);

  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const unreadCount = notifications.filter((item) => !item.isRead).length;
  const readCount = notifications.length - unreadCount;

  const contactUnreadCount = contactInquiries.filter((item) => !item.isRead).length;
  const contactReadCount = contactInquiries.length - contactUnreadCount;

  const isSuccess =
    message.toLowerCase().includes('successfully') ||
    message.toLowerCase().includes('marked');

  const filteredNotifications = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return notifications;

    return notifications.filter((item) =>
      [item.type, item.title, item.message, item.project?.name, item.project?.code].some(
        (value) => String(value || '').toLowerCase().includes(query),
      ),
    );
  }, [notifications, search]);

  const filteredContactInquiries = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return contactInquiries;

    return contactInquiries.filter((item) =>
      [
        item.name,
        item.email,
        item.phone,
        item.company,
        item.subject,
        item.message,
        item.status,
      ].some((value) => String(value || '').toLowerCase().includes(query)),
    );
  }, [contactInquiries, search]);

  useEffect(() => {
    loadPage();
  }, []);

  async function loadPage() {
    try {
      setLoading(true);
      setMessage('');

      const [notificationData, contactData, projectData, userData] =
        await Promise.all([
          notificationsApi.findMine(),
          contactApi.notifications(),
          projectsApi.findAll(),
          usersApi.findAll(),
        ]);

      setNotifications(notificationData);
      setContactInquiries(contactData);
      setProjects(projectData);
      setUsers(userData);

      if (userData.length > 0) {
        setForm((prev) => ({
          ...prev,
          userId: String(userData[0].id),
        }));
      }
    } catch (error: any) {
      setMessage(getErrorMessage(error, 'Failed to load notifications'));
    } finally {
      setLoading(false);
    }
  }

  async function loadNotificationsOnly() {
    const [notificationData, contactData] = await Promise.all([
      notificationsApi.findMine(),
      contactApi.notifications(),
    ]);

    setNotifications(notificationData);
    setContactInquiries(contactData);
  }

  async function runAction(
    action: () => Promise<any>,
    success: string,
    fallback: string,
  ) {
    try {
      setLoading(true);
      setMessage('');

      await action();

      setMessage(success);
      await loadNotificationsOnly();
    } catch (error: any) {
      setMessage(getErrorMessage(error, fallback));
    } finally {
      setLoading(false);
    }
  }

  async function saveNotification(e: React.FormEvent) {
    e.preventDefault();

    const payload = {
      userId: Number(form.userId),
      projectId: form.projectId ? Number(form.projectId) : null,
      type: form.type,
      title: form.title,
      message: form.message,
    };

    await runAction(
      async () => {
        if (editing) {
          await notificationsApi.update(editing.id, payload);
        } else {
          await notificationsApi.create(payload);
        }

        resetForm();
      },
      editing
        ? 'Notification updated successfully'
        : 'Notification created successfully',
      editing ? 'Failed to update notification' : 'Failed to create notification',
    );
  }

  function editNotification(item: NotificationItem) {
    setEditing(item);

    setForm({
      userId: String(item.userId),
      projectId: item.projectId ? String(item.projectId) : '',
      type: item.type || 'INFO',
      title: item.title,
      message: item.message,
    });
  }

  function resetForm() {
    setEditing(null);

    setForm({
      ...emptyForm,
      userId: users[0]?.id ? String(users[0].id) : '',
    });
  }

  async function markContactAsRead(id: number) {
    await runAction(
      () => contactApi.markAsRead(id),
      'Contact inquiry marked as read',
      'Failed to mark contact inquiry as read',
    );
  }

  return (
    <div>
      <PageHeader
        title="Notifications"
        description="View system notifications, project alerts, deadlines, and public contact inquiries."
        actionLabel="Mark All As Read"
        onAction={() =>
          runAction(
            () => notificationsApi.markAllAsRead(),
            'All notifications marked as read',
            'Failed to mark all as read',
          )
        }
      />

      {message && <Alert type={isSuccess ? 'success' : 'error'}>{message}</Alert>}

      {loading && <p>Loading notifications...</p>}

      <div className="module-grid">
        <div className="module-sidebar">
          <Card title={editing ? 'Edit Notification' : 'Create Notification'}>
            <form onSubmit={saveNotification}>
              <SelectField
                label="User"
                value={form.userId}
                onChange={(value) => setForm({ ...form, userId: value })}
              >
                <option value="">Select user</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} - {user.email}
                  </option>
                ))}
              </SelectField>

              <SelectField
                label="Project"
                value={form.projectId}
                onChange={(value) => setForm({ ...form, projectId: value })}
              >
                <option value="">No project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.code} - {project.name}
                  </option>
                ))}
              </SelectField>

              <SelectField
                label="Type"
                value={form.type}
                onChange={(value) => setForm({ ...form, type: value })}
              >
                {notificationTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </SelectField>

              <Input
                label="Title"
                value={form.title}
                onChange={(event) =>
                  setForm({ ...form, title: event.target.value })
                }
                required
              />

              <TextareaField
                label="Message"
                value={form.message}
                onChange={(value) => setForm({ ...form, message: value })}
              />

              <div style={{ display: 'flex', gap: 8 }}>
                <Button disabled={loading || !form.userId} style={{ flex: 1 }}>
                  {editing ? (
                    <>
                      <Save size={15} /> Save Changes
                    </>
                  ) : (
                    <>
                      <Bell size={15} /> Create Notification
                    </>
                  )}
                </Button>

                {editing && (
                  <Button type="button" variant="secondary" onClick={resetForm}>
                    <X size={15} /> Cancel
                  </Button>
                )}
              </div>
            </form>
          </Card>

          <Card title="Notification Summary">
            <InfoItem label="System Total" value={String(notifications.length)} />
            <InfoItem label="System Unread" value={String(unreadCount)} />
            <InfoItem label="System Read" value={String(readCount)} />
            <InfoItem
              label="Contact Messages"
              value={String(contactInquiries.length)}
            />
            <InfoItem
              label="Unread Contacts"
              value={String(contactUnreadCount)}
            />
            <InfoItem label="Read Contacts" value={String(contactReadCount)} />
          </Card>

          <Card title="Notification Types">
            {notificationTypes.map((type) => (
              <InfoItem
                key={type}
                label={type}
                value={String(countType(notifications, type))}
              />
            ))}
          </Card>
        </div>

        <div className="module-content">
          <Card title="Search & Actions">
            <div style={actionRowStyle}>
              <Input
                label="Search"
                placeholder="Search notifications, contacts, title, email, project..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />

              <IconActionButton title="Refresh" onClick={loadPage}>
                <RefreshCcw size={16} /> Refresh
              </IconActionButton>
            </div>
          </Card>

          <Card title="Public Contact Inquiries">
            {filteredContactInquiries.length === 0 && (
              <p>No public contact inquiries found.</p>
            )}

            <div style={{ display: 'grid', gap: 12 }}>
              {filteredContactInquiries.map((item) => (
                <div
                  key={item.id}
                  style={{
                    padding: 16,
                    borderRadius: 12,
                    border: item.isRead
                      ? '1px solid #e5e7eb'
                      : '2px solid #2563eb',
                    background: item.isRead ? '#ffffff' : '#eff6ff',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 12,
                    }}
                  >
                    <div>
                      <h3 style={{ margin: 0 }}>
                        {item.subject || 'New Contact Inquiry'}
                      </h3>

                      <p style={{ margin: '6px 0', fontWeight: 600 }}>
                        {item.name} — {item.email}
                      </p>

                      <p style={{ margin: '6px 0' }}>
                        {item.phone || 'No phone'} |{' '}
                        {item.company || 'No company'}
                      </p>
                    </div>

                    <StatusBadge status={item.isRead ? 'READ' : 'UNREAD'} />
                  </div>

                  <p style={{ marginTop: 12 }}>{truncate(item.message, 140)}</p>

                  <p style={{ color: '#64748b', fontSize: 13 }}>
                    {formatDateTime(item.createdAt)}
                  </p>

                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setViewingContact(item)}
                    >
                      <Eye size={15} /> View
                    </Button>

                    {!item.isRead && (
                      <Button
                        type="button"
                        onClick={() => markContactAsRead(item.id)}
                      >
                        <CheckCircle2 size={15} /> Mark as Read
                      </Button>
                    )}
                    <Button
  type="button"
  variant="danger"
  onClick={() =>
    runAction(
      () => contactApi.remove(item.id),
      'Contact inquiry deleted successfully',
      'Failed to delete contact inquiry',
    )
  }
>
  <Trash2 size={15} /> Delete
</Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card title="System Notification List">
            <DataTable<NotificationItem>
              columns={[
                {
                  header: 'Date',
                  accessor: (row) => formatDateTime(row.createdAt),
                },
                {
                  header: 'Type',
                  accessor: (row) => <StatusBadge status={row.type} />,
                },
                { header: 'Title', accessor: 'title' },
                {
                  header: 'Message',
                  accessor: (row) => truncate(row.message),
                },
                {
                  header: 'Project',
                  accessor: (row) => row.project?.name || row.projectId || '-',
                },
                {
                  header: 'Status',
                  accessor: (row) => (
                    <StatusBadge status={row.isRead ? 'READ' : 'UNREAD'} />
                  ),
                },
                {
                  header: 'Actions',
                  accessor: (row) => (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <IconOnlyButton title="View" onClick={() => setViewing(row)}>
                        <Eye size={15} />
                      </IconOnlyButton>

                      <IconOnlyButton title="Edit" onClick={() => editNotification(row)}>
                        <Edit size={15} />
                      </IconOnlyButton>

                      {row.isRead ? (
                        <IconOnlyButton
                          title="Mark as unread"
                          onClick={() =>
                            runAction(
                              () => notificationsApi.markAsUnread(row.id),
                              'Notification marked as unread',
                              'Failed to mark as unread',
                            )
                          }
                        >
                          <MailOpen size={15} />
                        </IconOnlyButton>
                      ) : (
                        <IconOnlyButton
                          title="Mark as read"
                          color="#16a34a"
                          onClick={() =>
                            runAction(
                              () => notificationsApi.markAsRead(row.id),
                              'Notification marked as read',
                              'Failed to mark as read',
                            )
                          }
                        >
                          <CheckCircle2 size={15} />
                        </IconOnlyButton>
                      )}

                      <IconOnlyButton
                        title="Delete"
                        color="#dc2626"
                        onClick={() =>
                          runAction(
                            () => notificationsApi.remove(row.id),
                            'Notification deleted successfully',
                            'Failed to delete notification',
                          )
                        }
                      >
                        <Trash2 size={15} />
                      </IconOnlyButton>
                    </div>
                  ),
                },
              ]}
              data={filteredNotifications}
              emptyMessage="No notifications found"
            />
          </Card>
        </div>
      </div>

      {viewing && (
        <NotificationModal item={viewing} onClose={() => setViewing(null)} />
      )}

      {viewingContact && (
        <ContactModal
          item={viewingContact}
          onClose={() => setViewingContact(null)}
          onMarkAsRead={() => markContactAsRead(viewingContact.id)}
        />
      )}
    </div>
  );
}

function NotificationModal({
  item,
  onClose,
}: {
  item: NotificationItem;
  onClose: () => void;
}) {
  return (
    <div style={modalOverlayStyle}>
      <div style={modalStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
          <h2 style={{ margin: 0 }}>{item.title}</h2>

          <Button type="button" variant="secondary" onClick={onClose}>
            <X size={15} /> Close
          </Button>
        </div>

        <div style={detailsGridStyle}>
          <Detail label="Type" value={item.type} />
          <Detail label="Status" value={item.isRead ? 'Read' : 'Unread'} />
          <Detail
            label="Project"
            value={item.project ? `${item.project.code} - ${item.project.name}` : '-'}
          />
          <Detail label="Created" value={formatDateTime(item.createdAt)} />
          <Detail label="Read At" value={formatDateTime(item.readAt)} />
          <Detail label="Message" value={item.message} wide />
        </div>
      </div>
    </div>
  );
}

function ContactModal({
  item,
  onClose,
  onMarkAsRead,
}: {
  item: ContactNotification;
  onClose: () => void;
  onMarkAsRead: () => void;
}) {
  return (
    <div style={modalOverlayStyle}>
      <div style={modalStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
          <h2 style={{ margin: 0 }}>
            {item.subject || 'New Contact Inquiry'}
          </h2>

          <Button type="button" variant="secondary" onClick={onClose}>
            <X size={15} /> Close
          </Button>
        </div>

        <div style={detailsGridStyle}>
          <Detail label="Status" value={item.isRead ? 'Read' : 'Unread'} />
          <Detail label="Created" value={formatDateTime(item.createdAt)} />
          <Detail label="Name" value={item.name} />
          <Detail label="Email" value={item.email} />
          <Detail label="Phone" value={item.phone || '-'} />
          <Detail label="Company" value={item.company || '-'} />
          <Detail label="Subject" value={item.subject || '-'} />
          <Detail label="Message" value={item.message} wide />
        </div>

        {!item.isRead && (
          <div style={{ marginTop: 20 }}>
            <Button type="button" onClick={onMarkAsRead}>
              <CheckCircle2 size={15} /> Mark as Read
            </Button>
          </div>
        )}
      </div>
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
        onChange={(event) => onChange(event.target.value)}
        style={fieldStyle}
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
        onChange={(event) => onChange(event.target.value)}
        rows={4}
        style={{ ...fieldStyle, resize: 'vertical' }}
        required
      />
    </div>
  );
}

function IconActionButton({
  children,
  title,
  onClick,
}: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      style={iconActionButtonStyle}
    >
      {children}
    </button>
  );
}

function IconOnlyButton({
  children,
  title,
  onClick,
  color,
}: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
  color?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      style={{ ...iconOnlyButtonStyle, color: color || '#334155' }}
    >
      {children}
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  return <span style={badgeStyle(status)}>{status}</span>;
}

function Detail({
  label,
  value,
  wide,
}: {
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <div style={{ gridColumn: wide ? '1 / -1' : undefined }}>
      <div style={{ color: '#64748b', fontSize: 13, marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontWeight: 600, whiteSpace: 'pre-wrap' }}>
        {value || '-'}
      </div>
    </div>
  );
}

function countType(items: NotificationItem[], type: string) {
  return items.filter((item) => item.type === type).length;
}

function formatDateTime(value?: string | null) {
  if (!value) return '-';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '-';

  return date.toLocaleString();
}

function truncate(value?: string | null, length = 70) {
  if (!value) return '-';
  return value.length > length ? `${value.slice(0, length)}...` : value;
}

function getErrorMessage(error: any, fallback: string) {
  return error?.response?.data?.message || error?.message || fallback;
}

const fieldStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 8,
  border: '1px solid #d1d5db',
  background: '#fff',
};

const actionRowStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr auto',
  gap: 12,
  alignItems: 'end',
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
  width: 'min(760px, 100%)',
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

function badgeStyle(status: string): React.CSSProperties {
  const normalized = String(status).toUpperCase();

  const base: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    borderRadius: 999,
    padding: '4px 10px',
    fontSize: 12,
    fontWeight: 700,
  };

  if (['SUCCESS', 'READ'].includes(normalized)) {
    return { ...base, background: '#dcfce7', color: '#166534' };
  }

  if (['INFO', 'APPROVAL'].includes(normalized)) {
    return { ...base, background: '#dbeafe', color: '#1d4ed8' };
  }

  if (['WARNING', 'DEADLINE', 'UNREAD'].includes(normalized)) {
    return { ...base, background: '#fef9c3', color: '#854d0e' };
  }

  if (['ERROR'].includes(normalized)) {
    return { ...base, background: '#fee2e2', color: '#991b1b' };
  }

  return { ...base, background: '#f1f5f9', color: '#475569' };
}