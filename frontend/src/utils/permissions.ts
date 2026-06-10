export function getAuthUser() {
  const raw = localStorage.getItem('authUser');

  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function getPermissions(): string[] {
  const user = getAuthUser();

  return user?.permissions || [];
}

export function hasPermission(permission: string): boolean {
  return getPermissions().includes(permission);
}

export function hasAnyPermission(permissions: string[]): boolean {
  const userPermissions = getPermissions();

  return permissions.some((permission) =>
    userPermissions.includes(permission),
  );
}

export function hasAllPermissions(permissions: string[]): boolean {
  const userPermissions = getPermissions();

  return permissions.every((permission) =>
    userPermissions.includes(permission),
  );
}