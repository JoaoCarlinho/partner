import { Role } from '../types/models.js';

// Permission definitions per role
export const PERMISSIONS: Record<Role, string[]> = {
  [Role.FIRM_ADMIN]: ['*'],
  [Role.ATTORNEY]: [
    'demands:*',
    'cases:*',
    'templates:manage',
    'plans:approve',
    'users:view',
    'reports:view',
  ],
  [Role.PARALEGAL]: [
    'demands:create',
    'demands:view',
    'cases:view',
    'messages:send',
    'templates:view',
  ],
  [Role.DEBTOR]: [
    'cases:view:own',
    'messages:send',
    'plans:propose',
    'assessment:submit',
  ],
  [Role.PUBLIC_DEFENDER]: [
    'cases:view:assigned',
    'messages:send',
    'notes:manage',
  ],
};

// Check if a role has a specific permission
export function hasPermission(role: Role, permission: string): boolean {
  const rolePerms = PERMISSIONS[role];

  // Wildcard permission
  if (rolePerms.includes('*')) {
    return true;
  }

  // Exact match
  if (rolePerms.includes(permission)) {
    return true;
  }

  // Wildcard category match (e.g., 'demands:*' matches 'demands:create')
  const [category] = permission.split(':');
  if (rolePerms.includes(`${category}:*`)) {
    return true;
  }

  return false;
}
