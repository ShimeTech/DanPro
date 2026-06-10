import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { authApi } from '../api/auth.api';
import type { AuthMe } from '../api/auth.api';
import { notificationsApi } from '../api/notifications.api';
import { LogOut } from 'lucide-react';

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
    async function loadLayoutData() {
      try {
const profile = await authApi.me();
setUser(profile);
localStorage.setItem('authUser', JSON.stringify(profile));
      } catch {
        localStorage.removeItem('accessToken');
        window.location.href = '/login';
      }

      try {
        const notifications = await notificationsApi.findMine();

        setUnreadCount(
          notifications.filter((notification) => !notification.isRead).length,
        );
      } catch {
        setUnreadCount(0);
      }
    }

    loadLayoutData();
  }, []);

function logout() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('authUser');
  window.location.href = '/login';
}

  const userName = user?.name || user?.email || 'User';
  const initials = getInitials(userName);

  return (
    <div
      className={`app-shell ${
        sidebarCollapsed ? 'sidebar-collapsed-shell' : ''
      }`}
    >
      <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <span className="sidebar-logo-icon">B</span>

            <div className="sidebar-logo-text">
              <h2>BuildPro IMS</h2>
              <p>Construction Management</p>
            </div>
          </div>

          <button
            className="sidebar-collapse-button"
            onClick={() => setSidebarCollapsed(true)}
            aria-label="Collapse sidebar"
          >
            ‹
          </button>
        </div>

        <nav className="sidebar-nav">
          {visibleMenuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                isActive ? 'sidebar-link active' : 'sidebar-link'
              }
            >
              <span className="sidebar-icon">{item.icon}</span>
              <span className="sidebar-text">{item.label}</span>
            </NavLink>
          ))}
        </nav>

<div className="sidebar-footer">
  <button
    className="logout-button"
    onClick={logout}
    title="Logout"
  >
    <LogOut size={18} />
  </button>
</div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="topbar-left">
            <button
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
            <Link to="/notifications" className="topbar-icon-button">
              🔔
              {unreadCount > 0 && (
                <span className="topbar-badge">{unreadCount}</span>
              )}
            </Link>

            <Link to="/profile" className="profile-shortcut">
              {user?.avatarUrl ? (
                <img
                  src={getFileUrl(user.avatarUrl)}
                  alt="Profile"
                  className="profile-avatar-image"
                />
              ) : (
                <span className="profile-avatar">{initials}</span>
              )}

              <span className="profile-text">
                <strong>{userName}</strong>
                <small>{user?.jobTitle || 'View profile'}</small>
              </span>
            </Link>

<button
  className="topbar-logout"
  onClick={logout}
  title="Logout"
>
  <LogOut size={18} />
</button>
          </div>
        </header>

        <section className="page-content">
          <Outlet />
        </section>
      </main>
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

function getFileUrl(path?: string | null) {
  if (!path) return '';

  if (path.startsWith('http')) return path;

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  const baseUrl = apiUrl.replace('/api', '');
  const cleanPath = path.replace(/\\/g, '/');

  return `${baseUrl}/${cleanPath}`;
}