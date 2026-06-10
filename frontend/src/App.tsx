import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import DashboardLayout from './layouts/DashboardLayout';
import PublicLayout from './layouts/PublicLayout';

import HomePage from './pages/public/HomePage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';

import ApprovalsPage from './pages/approvals/ApprovalsPage';
import AuditLogsPage from './pages/audit/AuditLogsPage';
import CompaniesPage from './pages/companies/CompaniesPage';
import CostPage from './pages/cost/CostPage';
import DailyReportsPage from './pages/daily-reports/DailyReportsPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import DocumentsPage from './pages/documents/DocumentsPage';
import FinancePage from './pages/finance/FinancePage';
import InventoryPage from './pages/inventory/InventoryPage';
import MilestonesPage from './pages/milestones/MilestonesPage';
import NotificationsPage from './pages/notifications/NotificationsPage';
import ProcurementPage from './pages/procurement/ProcurementPage';
import ProfilePage from './pages/profile/ProfilePage';
import ProjectsPage from './pages/projects/ProjectsPage';
import QualityPage from './pages/quality/QualityPage';
import ReportsPage from './pages/reports/ReportsPage';
import RfisPage from './pages/rfis/RfisPage';
import SafetyPage from './pages/safety/SafetyPage';
import SchedulesPage from './pages/schedules/SchedulesPage';
import SettingsPage from './pages/settings/SettingsPage';
import SubmittalsPage from './pages/submittals/SubmittalsPage';
import TasksPage from './pages/tasks/TasksPage';
import UsersPage from './pages/users/UsersPage';
import WbsPage from './pages/wbs/WbsPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('accessToken');

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('accessToken');

  if (token) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function ProtectedPermissionRoute({
  children,
  required,
}: {
  children: React.ReactNode;
  required: string[];
}) {
  const token = localStorage.getItem('accessToken');
  const rawUser = localStorage.getItem('authUser');

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (!rawUser) {
    return <Navigate to="/dashboard" replace />;
  }

  try {
    const user = JSON.parse(rawUser);
    const permissions: string[] = user.permissions || [];

    const allowed = required.length === 0
      ? true
      : required.some((permission) => permissions.includes(permission));

    if (!allowed) {
      return <Navigate to="/dashboard" replace />;
    }

    return children;
  } catch {
    return <Navigate to="/dashboard" replace />;
  }
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public website and auth pages */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<HomePage />} />

          <Route
            path="/login"
            element={
              <PublicOnlyRoute>
                <LoginPage />
              </PublicOnlyRoute>
            }
          />

          <Route
            path="/register"
            element={
              <PublicOnlyRoute>
                <RegisterPage />
              </PublicOnlyRoute>
            }
          />
        </Route>

        {/* Protected dashboard app */}
        <Route
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
<Route path="/dashboard" element={<DashboardPage />} />

          <Route
            path="/companies"
            element={
              <ProtectedPermissionRoute required={['companies:read']}>
                <CompaniesPage />
              </ProtectedPermissionRoute>
            }
          />

          <Route
            path="/projects"
            element={
              <ProtectedPermissionRoute required={['projects:read']}>
                <ProjectsPage />
              </ProtectedPermissionRoute>
            }
          />

          <Route
            path="/wbs"
            element={
              <ProtectedPermissionRoute required={['wbs:read']}>
                <WbsPage />
              </ProtectedPermissionRoute>
            }
          />

          <Route
            path="/tasks"
            element={
              <ProtectedPermissionRoute required={['tasks:read']}>
                <TasksPage />
              </ProtectedPermissionRoute>
            }
          />

          <Route
            path="/milestones"
            element={
              <ProtectedPermissionRoute required={['milestones:read']}>
                <MilestonesPage />
              </ProtectedPermissionRoute>
            }
          />

          <Route
            path="/schedules"
            element={
              <ProtectedPermissionRoute required={['schedules:read']}>
                <SchedulesPage />
              </ProtectedPermissionRoute>
            }
          />

          <Route
            path="/daily-reports"
            element={
              <ProtectedPermissionRoute required={['daily_reports:read']}>
                <DailyReportsPage />
              </ProtectedPermissionRoute>
            }
          />

          <Route
            path="/documents"
            element={
              <ProtectedPermissionRoute required={['documents:read']}>
                <DocumentsPage />
              </ProtectedPermissionRoute>
            }
          />

          <Route
            path="/rfis"
            element={
              <ProtectedPermissionRoute required={['rfis:read']}>
                <RfisPage />
              </ProtectedPermissionRoute>
            }
          />

          <Route
            path="/submittals"
            element={
              <ProtectedPermissionRoute required={['submittals:read']}>
                <SubmittalsPage />
              </ProtectedPermissionRoute>
            }
          />

          <Route
            path="/approvals"
            element={
              <ProtectedPermissionRoute required={['approvals:read']}>
                <ApprovalsPage />
              </ProtectedPermissionRoute>
            }
          />

          <Route
            path="/quality"
            element={
              <ProtectedPermissionRoute required={['quality:read']}>
                <QualityPage />
              </ProtectedPermissionRoute>
            }
          />

          <Route
            path="/safety"
            element={
              <ProtectedPermissionRoute required={['safety:read']}>
                <SafetyPage />
              </ProtectedPermissionRoute>
            }
          />

          <Route
            path="/procurement"
            element={
              <ProtectedPermissionRoute required={['procurement:read']}>
                <ProcurementPage />
              </ProtectedPermissionRoute>
            }
          />

          <Route
            path="/inventory"
            element={
              <ProtectedPermissionRoute required={['inventory:read']}>
                <InventoryPage />
              </ProtectedPermissionRoute>
            }
          />

          <Route
            path="/cost"
            element={
              <ProtectedPermissionRoute required={['cost:read']}>
                <CostPage />
              </ProtectedPermissionRoute>
            }
          />

          <Route
            path="/finance"
            element={
              <ProtectedPermissionRoute required={['finance:read']}>
                <FinancePage />
              </ProtectedPermissionRoute>
            }
          />

          <Route
            path="/reports"
            element={
              <ProtectedPermissionRoute required={['reports:read']}>
                <ReportsPage />
              </ProtectedPermissionRoute>
            }
          />

          <Route
            path="/audit-logs"
            element={
              <ProtectedPermissionRoute required={['audit_logs:read']}>
                <AuditLogsPage />
              </ProtectedPermissionRoute>
            }
          />

          <Route
            path="/notifications"
            element={
              <ProtectedPermissionRoute required={['notifications:read']}>
                <NotificationsPage />
              </ProtectedPermissionRoute>
            }
          />

          <Route
            path="/users"
            element={
              <ProtectedPermissionRoute required={['users:read']}>
                <UsersPage />
              </ProtectedPermissionRoute>
            }
          />

          <Route
            path="/profile"
            element={
              <ProtectedPermissionRoute required={[]}>
                <ProfilePage />
              </ProtectedPermissionRoute>
            }
          />

          <Route
            path="/settings"
            element={
              <ProtectedPermissionRoute required={['settings:read', 'roles:read']}>
                <SettingsPage />
              </ProtectedPermissionRoute>
            }
          />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}