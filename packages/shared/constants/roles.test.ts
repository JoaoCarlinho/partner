import { describe, it, expect } from 'vitest';
import { Role } from '../types/models.js';
import {
  hasPermission,
  hasRoleOrHigher,
  isStaffRole,
  getManageableRoles,
  requiresResourceCheck,
  ROLE_HIERARCHY,
  PERMISSIONS,
} from './roles.js';

describe('Role hierarchy functions', () => {
  describe('ROLE_HIERARCHY', () => {
    it('should have correct order (lowest to highest)', () => {
      expect(ROLE_HIERARCHY).toEqual([
        Role.PARALEGAL,
        Role.ATTORNEY,
        Role.FIRM_ADMIN,
      ]);
    });
  });

  describe('hasRoleOrHigher', () => {
    it('FIRM_ADMIN should have all staff roles', () => {
      expect(hasRoleOrHigher(Role.FIRM_ADMIN, Role.FIRM_ADMIN)).toBe(true);
      expect(hasRoleOrHigher(Role.FIRM_ADMIN, Role.ATTORNEY)).toBe(true);
      expect(hasRoleOrHigher(Role.FIRM_ADMIN, Role.PARALEGAL)).toBe(true);
    });

    it('ATTORNEY should have ATTORNEY and PARALEGAL roles', () => {
      expect(hasRoleOrHigher(Role.ATTORNEY, Role.FIRM_ADMIN)).toBe(false);
      expect(hasRoleOrHigher(Role.ATTORNEY, Role.ATTORNEY)).toBe(true);
      expect(hasRoleOrHigher(Role.ATTORNEY, Role.PARALEGAL)).toBe(true);
    });

    it('PARALEGAL should only have PARALEGAL role', () => {
      expect(hasRoleOrHigher(Role.PARALEGAL, Role.FIRM_ADMIN)).toBe(false);
      expect(hasRoleOrHigher(Role.PARALEGAL, Role.ATTORNEY)).toBe(false);
      expect(hasRoleOrHigher(Role.PARALEGAL, Role.PARALEGAL)).toBe(true);
    });

    it('DEBTOR should only match itself (not in hierarchy)', () => {
      expect(hasRoleOrHigher(Role.DEBTOR, Role.DEBTOR)).toBe(true);
      expect(hasRoleOrHigher(Role.DEBTOR, Role.PARALEGAL)).toBe(false);
      expect(hasRoleOrHigher(Role.PARALEGAL, Role.DEBTOR)).toBe(false);
    });

    it('PUBLIC_DEFENDER should only match itself (not in hierarchy)', () => {
      expect(hasRoleOrHigher(Role.PUBLIC_DEFENDER, Role.PUBLIC_DEFENDER)).toBe(true);
      expect(hasRoleOrHigher(Role.PUBLIC_DEFENDER, Role.ATTORNEY)).toBe(false);
    });
  });

  describe('isStaffRole', () => {
    it('should return true for staff roles', () => {
      expect(isStaffRole(Role.FIRM_ADMIN)).toBe(true);
      expect(isStaffRole(Role.ATTORNEY)).toBe(true);
      expect(isStaffRole(Role.PARALEGAL)).toBe(true);
    });

    it('should return false for non-staff roles', () => {
      expect(isStaffRole(Role.DEBTOR)).toBe(false);
      expect(isStaffRole(Role.PUBLIC_DEFENDER)).toBe(false);
    });
  });

  describe('getManageableRoles', () => {
    it('FIRM_ADMIN can manage all staff roles', () => {
      const manageable = getManageableRoles(Role.FIRM_ADMIN);
      expect(manageable).toContain(Role.FIRM_ADMIN);
      expect(manageable).toContain(Role.ATTORNEY);
      expect(manageable).toContain(Role.PARALEGAL);
      expect(manageable).not.toContain(Role.DEBTOR);
      expect(manageable).not.toContain(Role.PUBLIC_DEFENDER);
    });

    it('non-admins cannot manage any roles', () => {
      expect(getManageableRoles(Role.ATTORNEY)).toEqual([]);
      expect(getManageableRoles(Role.PARALEGAL)).toEqual([]);
      expect(getManageableRoles(Role.DEBTOR)).toEqual([]);
    });
  });
});

describe('Permission functions', () => {
  describe('hasPermission', () => {
    it('FIRM_ADMIN has wildcard (*) permission', () => {
      expect(hasPermission(Role.FIRM_ADMIN, 'anything:here')).toBe(true);
      expect(hasPermission(Role.FIRM_ADMIN, 'users:manage')).toBe(true);
    });

    it('ATTORNEY has category wildcard permissions', () => {
      expect(hasPermission(Role.ATTORNEY, 'demands:create')).toBe(true);
      expect(hasPermission(Role.ATTORNEY, 'demands:view')).toBe(true);
      expect(hasPermission(Role.ATTORNEY, 'cases:manage')).toBe(true);
    });

    it('ATTORNEY has specific permissions', () => {
      expect(hasPermission(Role.ATTORNEY, 'templates:manage')).toBe(true);
      expect(hasPermission(Role.ATTORNEY, 'users:view')).toBe(true);
    });

    it('PARALEGAL has limited permissions', () => {
      expect(hasPermission(Role.PARALEGAL, 'demands:create')).toBe(true);
      expect(hasPermission(Role.PARALEGAL, 'demands:view')).toBe(true);
      expect(hasPermission(Role.PARALEGAL, 'templates:manage')).toBe(false);
      expect(hasPermission(Role.PARALEGAL, 'users:view')).toBe(false);
    });

    it('DEBTOR has scoped permissions', () => {
      expect(hasPermission(Role.DEBTOR, 'cases:view:own')).toBe(true);
      expect(hasPermission(Role.DEBTOR, 'messages:send')).toBe(true);
      expect(hasPermission(Role.DEBTOR, 'cases:view')).toBe(false);
    });

    it('PUBLIC_DEFENDER has assigned scope permissions', () => {
      expect(hasPermission(Role.PUBLIC_DEFENDER, 'cases:view:assigned')).toBe(true);
      expect(hasPermission(Role.PUBLIC_DEFENDER, 'notes:manage')).toBe(true);
      expect(hasPermission(Role.PUBLIC_DEFENDER, 'cases:manage')).toBe(false);
    });
  });

  describe('requiresResourceCheck', () => {
    it('should detect :own scope', () => {
      const result = requiresResourceCheck('cases:view:own');
      expect(result.requires).toBe(true);
      expect(result.scope).toBe('own');
    });

    it('should detect :assigned scope', () => {
      const result = requiresResourceCheck('cases:view:assigned');
      expect(result.requires).toBe(true);
      expect(result.scope).toBe('assigned');
    });

    it('should not require check for normal permissions', () => {
      expect(requiresResourceCheck('demands:create').requires).toBe(false);
      expect(requiresResourceCheck('users:view').requires).toBe(false);
    });
  });
});
