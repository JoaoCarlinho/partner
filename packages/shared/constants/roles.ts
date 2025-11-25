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

/**
 * Role hierarchy for internal staff (higher index = higher privilege)
 * Debtor and Public Defender are outside this hierarchy
 */
export const ROLE_HIERARCHY: Role[] = [
  Role.PARALEGAL,
  Role.ATTORNEY,
  Role.FIRM_ADMIN,
];

/**
 * Check if a role is at least as high as another in the hierarchy
 * Returns false if either role is outside the hierarchy (Debtor, Public Defender)
 */
export function hasRoleOrHigher(userRole: Role, requiredRole: Role): boolean {
  const userIndex = ROLE_HIERARCHY.indexOf(userRole);
  const requiredIndex = ROLE_HIERARCHY.indexOf(requiredRole);

  // If either role is not in hierarchy, they cannot be compared
  if (userIndex === -1 || requiredIndex === -1) {
    return userRole === requiredRole;
  }

  return userIndex >= requiredIndex;
}

/**
 * Check if a role is in the staff hierarchy (not Debtor or Public Defender)
 */
export function isStaffRole(role: Role): boolean {
  return ROLE_HIERARCHY.includes(role);
}

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: Role, permission: string): boolean {
  const rolePerms = PERMISSIONS[role];

  // Wildcard permission (full access)
  if (rolePerms.includes('*')) {
    return true;
  }

  // Exact match
  if (rolePerms.includes(permission)) {
    return true;
  }

  // Wildcard category match (e.g., 'demands:*' matches 'demands:create')
  const [category, action] = permission.split(':');
  if (rolePerms.includes(`${category}:*`)) {
    return true;
  }

  // Check for :own or :assigned scope - if permission requires scope,
  // check if base permission exists
  if (action) {
    const [baseAction, scope] = action.split(':');
    if (scope) {
      // User has scoped permission, check if it matches
      const scopedPerm = `${category}:${baseAction}:${scope}`;
      if (rolePerms.includes(scopedPerm)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Check if permission requires resource-level verification (:own or :assigned)
 */
export function requiresResourceCheck(permission: string): { requires: boolean; scope?: 'own' | 'assigned' } {
  const parts = permission.split(':');
  if (parts.length >= 3) {
    const scope = parts[2] as 'own' | 'assigned';
    if (scope === 'own' || scope === 'assigned') {
      return { requires: true, scope };
    }
  }
  return { requires: false };
}

/**
 * Get all roles that a given role can manage (assign/modify)
 * Users can only manage roles equal to or lower than their own
 */
export function getManageableRoles(userRole: Role): Role[] {
  if (userRole === Role.FIRM_ADMIN) {
    // Admins can manage all staff roles but not Debtor/Public Defender (created differently)
    return [Role.FIRM_ADMIN, Role.ATTORNEY, Role.PARALEGAL];
  }

  // Non-admins cannot manage roles
  return [];
}
