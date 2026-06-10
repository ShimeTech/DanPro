import { Navigate } from 'react-router-dom';

type Props = {
  children: React.ReactNode;
  required: string[];
};

export default function ProtectedPermissionRoute({ children, required }: Props) {
  const rawUser = localStorage.getItem('authUser');

  if (!rawUser) {
    return <Navigate to="/login" replace />;
  }

  const user = JSON.parse(rawUser);
  const permissions: string[] = user.permissions || [];

  const allowed = required.some((permission) =>
    permissions.includes(permission),
  );

  if (!allowed) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}