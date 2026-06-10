import { hasAnyPermission } from '../../utils/permissions';

type Props = {
  permissions: string[];
  children: React.ReactNode;
};

export default function PermissionGuard({
  permissions,
  children,
}: Props) {
  const allowed = hasAnyPermission(permissions);

  if (!allowed) {
    return null;
  }

  return <>{children}</>;
}