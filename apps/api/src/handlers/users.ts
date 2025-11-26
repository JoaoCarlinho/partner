import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Role, getManageableRoles, isStaffRole } from '@steno/shared';
import { prisma } from '../lib/prisma.js';
import { Errors } from '../lib/errors.js';
import { sendSuccess } from '../lib/response.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireAdmin } from '../middleware/authorize.js';

const router = Router();

// Schema for role update
const updateRoleSchema = z.object({
  role: z.nativeEnum(Role),
});

/**
 * PUT /api/v1/users/:userId/role
 * Update a user's role
 *
 * Story 1-4 Acceptance Criteria:
 * AC3: Role assignment on user creation/update
 * AC5: Role hierarchy enforced (Admin > Attorney > Paralegal)
 */
router.put('/:userId/role', authenticate, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;

    // Validate input
    const validation = updateRoleSchema.safeParse(req.body);
    if (!validation.success) {
      throw Errors.validation('Invalid role', {
        role: ['Must be a valid role: FIRM_ADMIN, ATTORNEY, PARALEGAL'],
      });
    }

    const { role: newRole } = validation.data;

    // Check if user can manage the target role
    const manageableRoles = getManageableRoles(req.user!.role);
    if (!manageableRoles.includes(newRole)) {
      throw Errors.forbidden('Cannot assign this role');
    }

    // Only staff roles can be assigned via this endpoint
    if (!isStaffRole(newRole)) {
      throw Errors.validation('Invalid role for staff member', {
        role: ['Debtor and Public Defender roles cannot be assigned via this endpoint'],
      });
    }

    // Find user to update
    const userToUpdate = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!userToUpdate) {
      throw Errors.notFound('User not found');
    }

    // Ensure user is in same organization
    if (userToUpdate.organizationId !== req.user!.organizationId) {
      throw Errors.forbidden('Cannot modify users from other organizations');
    }

    // Prevent self-demotion of last admin
    if (userToUpdate.id === req.user!.id && newRole !== Role.FIRM_ADMIN) {
      // Check if there are other admins
      const adminCount = await prisma.user.count({
        where: {
          organizationId: req.user!.organizationId,
          role: Role.FIRM_ADMIN,
        },
      });

      if (adminCount <= 1) {
        throw Errors.validation('Cannot demote last admin', {
          role: ['Organization must have at least one admin'],
        });
      }
    }

    // Update role
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role: newRole },
    });

    // Invalidate all sessions for the user (force re-login with new role)
    await prisma.session.deleteMany({
      where: { userId },
    });

    sendSuccess(res, {
      id: updatedUser.id,
      email: updatedUser.email,
      role: updatedUser.role,
      updatedAt: updatedUser.updatedAt.toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/users
 * List users in organization
 */
router.get('/', authenticate, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await prisma.user.findMany({
      where: {
        organizationId: req.user!.organizationId,
      },
      select: {
        id: true,
        email: true,
        role: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    sendSuccess(res, { users });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/users/:userId
 * Get a specific user
 */
router.get('/:userId', authenticate, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!user) {
      throw Errors.notFound('User not found');
    }

    // Ensure user is in same organization
    if (user.organization.id !== req.user!.organizationId) {
      throw Errors.forbidden('Cannot view users from other organizations');
    }

    sendSuccess(res, { user });
  } catch (error) {
    next(error);
  }
});

export default router;
