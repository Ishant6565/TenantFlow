export type Role = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';

export type Permission =
  | 'org:update'
  | 'org:delete'
  | 'billing:manage'
  | 'member:invite'
  | 'member:remove'
  | 'member:update_role'
  | 'project:create'
  | 'project:read'
  | 'project:delete'
  | 'audit:read'
  | 'api_key:manage';

const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  OWNER: [
    'org:update',
    'org:delete',
    'billing:manage',
    'member:invite',
    'member:remove',
    'member:update_role',
    'project:create',
    'project:read',
    'project:delete',
    'audit:read',
    'api_key:manage',
  ],
  ADMIN: [
    'org:update',
    'billing:manage',
    'member:invite',
    'member:remove',
    'member:update_role',
    'project:create',
    'project:read',
    'project:delete',
    'audit:read',
    'api_key:manage',
  ],
  MEMBER: [
    'project:create',
    'project:read',
  ],
  VIEWER: [
    'project:read',
  ],
};

/**
 * Single, centralized permission evaluator.
 * Prevents ad-hoc role checks scattered across UI or API endpoints.
 */
export function hasPermission(role: string, permission: Permission): boolean {
  const normalizedRole = role.toUpperCase() as Role;
  const permissions = ROLE_PERMISSIONS[normalizedRole];
  if (!permissions) return false;
  return permissions.includes(permission);
}

/**
 * Throws an explicit 403 Forbidden error if user role lacks required permission.
 */
export function assertPermission(role: string, permission: Permission): void {
  if (!hasPermission(role, permission)) {
    throw new Error(
      `FORBIDDEN: Role '${role}' does not have required permission '${permission}'`
    );
  }
}
