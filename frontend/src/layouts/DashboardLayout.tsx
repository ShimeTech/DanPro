import { useEffect, useMemo, useState } from 'react';
import { LogOut } from 'lucide-react';
import { authApi } from '../api/auth.api';
import type { AuthMe } from '../api/auth.api';
import { notificationsApi } from '../api/notifications.api';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';

const menuItems = [
  {
    icon: '📊',
    label: 'Dashboard',
    path: '/dashboard',
    permissions: ['dashboard:read'],
  },
  {
    icon: '🏢',
    label: 'Companies',
    path: '/companies',
    permissions: ['companies:read'],
  },
  {
    icon: '👥',
    label: 'Users',
    path: '/users',
    permissions: ['users:read'],
  },
  {
    icon: '🏗️',
    label: 'Projects',
    path: '/projects',
    permissions: ['projects:read'],
  },
  {
    icon: '🧩',
    label: 'WBS',
    path: '/wbs',
    permissions: ['wbs:read'],
  },
  {
    icon: '✅',
    label: 'Tasks',
    path: '/tasks',
    permissions: ['tasks:read'],
  },
  {
    icon: '🎯',
    label: 'Milestones',
    path: '/milestones',
    permissions: ['milestones:read'],
  },
  {
    icon: '🗓️',
    label: 'Schedules',
    path: '/schedules',
    permissions: ['schedules:read'],
  },
  {
    icon: '📝',
    label: 'Daily Reports',
    path: '/daily-reports',
    permissions: ['daily_reports:read'],
  },
  {
    icon: '📁',
    label: 'Documents',
    path: '/documents',
    permissions: ['documents:read'],
  },
  {
    icon: '❓',
    label: 'RFIs',
    path: '/rfis',
    permissions: ['rfis:read'],
  },
  {
    icon: '📤',
    label: 'Submittals',
    path: '/submittals',
    permissions: ['submittals:read'],
  },
  {
    icon: '✔️',
    label: 'Approvals',
    path: '/approvals',
    permissions: ['approvals:read'],
  },
  {
    icon: '🛡️',
    label: 'Quality',
    path: '/quality',
    permissions: ['quality:read'],
  },
  {
    icon: '⛑️',
    label: 'Safety',
    path: '/safety',
    permissions: ['safety:read'],
  },
  {
    icon: '🛒',
    label: 'Procurement',
    path: '/procurement',
    permissions: ['procurement:read'],
  },
  {
    icon: '📦',
    label: 'Inventory',
    path: '/inventory',
    permissions: ['inventory:read'],
  },
  {
    icon: '💰',
    label: 'Cost',
    path: '/cost',
    permissions: ['cost:read'],
  },
  {
    icon: '🏦',
    label: 'Finance',
    path: '/finance',
    permissions: ['finance:read'],
  },
  {
    icon: '📈',
    label: 'Reports',
    path: '/reports',
    permissions: ['reports:read'],
  },
  {
    icon: '🔔',
    label: 'Notifications',
    path: '/notifications',
    permissions: ['notifications:read'],
  },
  {
    icon: '📜',
    label: 'Audit Logs',
    path: '/audit-logs',
    permissions: ['audit_logs:read'],
  },
  {
    icon: '👤',
    label: 'Profile',
    path: '/profile',
    permissions: [],
  },
  {
    icon: '⚙️',
    label: 'Settings',
    path: '/settings',
    permissions: ['settings:read', 'roles:read'],
  },
];

export default function DashboardLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [user, setUser] = useState<AuthMe | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [layoutError, setLayoutError] = useState('');
  const navigate = useNavigate();

  const permissions = user?.permissions ?? [];

  const visibleMenuItems = useMemo(() => {
    return menuItems.filter((item) => {
      if (item.permissions.length === 0) return true;

      return item.permissions.some((permission) =>
        permissions.includes(permission),
      );
    });
  }, [permissions]);

  useEffect(() => {
    let isMounted = true;

    async function loadLayoutData() {
      try {
        setLoading(true);
        setLayoutError('');

        const profile = await authApi.me();

        if (!isMounted) return;

        setUser(profile);
        localStorage.setItem('authUser', JSON.stringify(profile));

        try {
          const notifications = await notificationsApi.findMine();

          if (!isMounted) return;

          setUnreadCount(
            notifications.filter((notification) => !notification.isRead).length,
          );
        } catch {
          if (isMounted) {
            setUnreadCount(0);
          }
        }
      } catch {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('authUser');
      navigate('/login', { replace: true });
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadLayoutData();

    return () => {
      isMounted = false;
    };
  }, []);

function logout() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('authUser');
  navigate('/login', { replace: true });
}

  const userName = user?.name || user?.email || 'User';
  const initials = getInitials(userName);

  if (loading) {
    return <AppShellLoading />;
  }

  if (layoutError) {
    return (
      <div
        role="alert"
        style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          background: '#f9fafb',
          padding: 24,
        }}
      >
        <div
          style={{
            maxWidth: 460,
            width: '100%',
            padding: 24,
            borderRadius: 16,
            background: '#ffffff',
            border: '1px solid #fee2e2',
            boxShadow: '0 20px 40px rgba(15, 23, 42, 0.08)',
          }}
        >
          <h1 style={{ margin: '0 0 8px', fontSize: 22, color: '#991b1b' }}>
            Unable to load workspace
          </h1>

          <p style={{ margin: '0 0 18px', color: '#6b7280' }}>
            {layoutError}
          </p>

          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              border: 0,
              borderRadius: 10,
              padding: '10px 14px',
              background: '#2563eb',
              color: '#ffffff',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`app-shell ${
        sidebarCollapsed ? 'sidebar-collapsed-shell' : ''
      }`}
    >
      <aside
        className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}
        aria-label="Main navigation"
      >
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <span className="sidebar-logo-icon" aria-hidden="true">
              B
            </span>

            <div className="sidebar-logo-text">
              <h2>BuildPro IMS</h2>
              <p>Construction Management</p>
            </div>
          </div>

          <button
            type="button"
            className="sidebar-collapse-button"
            onClick={() => setSidebarCollapsed(true)}
            aria-label="Collapse sidebar"
          >
            ‹
          </button>
        </div>

        <nav className="sidebar-nav" aria-label="Workspace modules">
          {visibleMenuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                isActive ? 'sidebar-link active' : 'sidebar-link'
              }
              title={sidebarCollapsed ? item.label : undefined}
            >
              <span className="sidebar-icon" aria-hidden="true">
                {item.icon}
              </span>
              <span className="sidebar-text">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button
            type="button"
            className="logout-button"
            onClick={logout}
            title="Logout"
            aria-label="Logout"
          >
            <LogOut size={18} aria-hidden="true" />
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="topbar-left">
            <button
              type="button"
              className="topbar-sidebar-toggle"
              onClick={() => setSidebarCollapsed(false)}
              aria-label="Open sidebar"
            >
              ☰
            </button>

            <div>
              <strong>BuildPro IMS</strong>
              <p style={{ margin: 0, color: '#6b7280', fontSize: 12 }}>
                Enterprise Construction Integrated Management System
              </p>
            </div>
          </div>

          <div className="topbar-actions">
            <Link
              to="/notifications"
              className="topbar-icon-button"
              aria-label={
                unreadCount > 0
                  ? `${unreadCount} unread notifications`
                  : 'Notifications'
              }
            >
              <span aria-hidden="true">🔔</span>

              {unreadCount > 0 && (
                <span className="topbar-badge">{unreadCount}</span>
              )}
            </Link>

            <Link to="/profile" className="profile-shortcut">
              {user?.avatarUrl ? (
                <img
                  src={getFileUrl(user.avatarUrl)}
                  alt={`${userName} profile`}
                  className="profile-avatar-image"
                />
              ) : (
                <span className="profile-avatar" aria-hidden="true">
                  {initials}
                </span>
              )}

              <span className="profile-text">
                <strong>{userName}</strong>
                <small>{user?.jobTitle || 'View profile'}</small>
              </span>
            </Link>

            <button
              type="button"
              className="topbar-logout"
              onClick={logout}
              title="Logout"
              aria-label="Logout"
            >
              <LogOut size={18} aria-hidden="true" />
            </button>
          </div>
        </header>

        <section className="page-content" aria-live="polite">
          <Outlet />
        </section>
      </main>
    </div>
  );
}

function AppShellLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      style={{
        minHeight: '100vh',
        display: 'grid',
        gridTemplateColumns: '280px minmax(0, 1fr)',
        background: '#f9fafb',
      }}
    >
      <aside
        style={{
          background: '#111827',
          padding: 20,
          color: '#ffffff',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: 28,
          }}
        >
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              background: 'rgba(255,255,255,0.16)',
              animation: 'app-shell-pulse 1.4s ease-in-out infinite',
            }}
          />

          <div style={{ flex: 1 }}>
            <LoadingBar width="70%" height={14} dark />
            <LoadingBar width="52%" height={10} marginTop={8} dark />
          </div>
        </div>

        {Array.from({ length: 10 }).map((_, index) => (
          <div
            key={index}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginBottom: 14,
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: 'rgba(255,255,255,0.12)',
                animation: 'app-shell-pulse 1.4s ease-in-out infinite',
              }}
            />
            <LoadingBar width={`${60 + (index % 3) * 8}%`} height={12} dark />
          </div>
        ))}
      </aside>

      <main style={{ minWidth: 0 }}>
        <header
          style={{
            minHeight: 72,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0 24px',
            background: '#ffffff',
            borderBottom: '1px solid #e5e7eb',
          }}
        >
          <div>
            <LoadingBar width="160px" height={14} />
            <LoadingBar width="280px" height={10} marginTop={8} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <LoadingCircle size={38} />
            <LoadingBar width="120px" height={14} />
          </div>
        </header>

        <section style={{ padding: 24 }}>
          <div
            style={{
              maxWidth: 1180,
              margin: '0 auto',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                marginBottom: 24,
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
                  animation: 'app-shell-spin 0.8s linear infinite',
                }}
              />

              <div>
                <strong style={{ color: '#111827' }}>
                  Loading workspace
                </strong>
                <p
                  style={{
                    margin: '4px 0 0',
                    color: '#6b7280',
                    fontSize: 14,
                  }}
                >
                  Verifying your session and preparing your modules.
                </p>
              </div>
            </div>

            <section
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 16,
                marginBottom: 24,
              }}
            >
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  style={{
                    padding: 18,
                    borderRadius: 16,
                    background: '#ffffff',
                    border: '1px solid #e5e7eb',
                    boxShadow: '0 10px 24px rgba(15, 23, 42, 0.05)',
                  }}
                >
                  <LoadingBar width="44%" height={13} />
                  <LoadingBar width="34%" height={34} marginTop={16} />
                  <LoadingBar width="72%" height={12} marginTop={14} />
                </div>
              ))}
            </section>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 2fr) minmax(280px, 1fr)',
                gap: 16,
              }}
            >
              <div
                style={{
                  minHeight: 280,
                  padding: 18,
                  borderRadius: 16,
                  background: '#ffffff',
                  border: '1px solid #e5e7eb',
                }}
              >
                <LoadingBar width="180px" height={16} />

                {Array.from({ length: 5 }).map((_, index) => (
                  <LoadingBar
                    key={index}
                    width="100%"
                    height={18}
                    marginTop={22}
                  />
                ))}
              </div>

              <div
                style={{
                  minHeight: 280,
                  padding: 18,
                  borderRadius: 16,
                  background: '#ffffff',
                  border: '1px solid #e5e7eb',
                }}
              >
                <LoadingBar width="150px" height={16} />

                {Array.from({ length: 6 }).map((_, index) => (
                  <LoadingBar
                    key={index}
                    width={`${70 + (index % 2) * 20}%`}
                    height={16}
                    marginTop={22}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      <style>
        {`
          @keyframes app-shell-spin {
            to {
              transform: rotate(360deg);
            }
          }

          @keyframes app-shell-pulse {
            0%, 100% {
              opacity: 1;
            }
            50% {
              opacity: 0.45;
            }
          }

          @media (max-width: 900px) {
            [role='status'][aria-busy='true'] {
              grid-template-columns: 1fr !important;
            }

            [role='status'][aria-busy='true'] aside {
              display: none;
            }
          }
        `}
      </style>
    </div>
  );
}

function LoadingBar({
  width,
  height,
  marginTop = 0,
  dark = false,
}: {
  width: string;
  height: number;
  marginTop?: number;
  dark?: boolean;
}) {
  return (
    <div
      style={{
        width,
        height,
        marginTop,
        borderRadius: 999,
        background: dark ? 'rgba(255,255,255,0.16)' : '#e5e7eb',
        animation: 'app-shell-pulse 1.4s ease-in-out infinite',
      }}
    />
  );
}

function LoadingCircle({ size }: { size: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: '#e5e7eb',
        animation: 'app-shell-pulse 1.4s ease-in-out infinite',
      }}
    />
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

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  const baseUrl = apiUrl.replace(/\/api\/?$/, '');
  const cleanPath = path.replace(/\\/g, '/').replace(/^\/+/, '');

  return `${baseUrl}/${cleanPath}`;
}