import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import { successResponse } from '../lib/response.js';
import { Errors } from '../lib/errors.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireAdmin } from '../middleware/authorize.js';
import { tenantContext } from '../middleware/tenantContext.js';
import {
  updateOrganizationSchema,
  DEFAULT_ORGANIZATION_SETTINGS,
  OrganizationSettings,
} from '@steno/shared';

const router = Router();

// All routes require authentication
router.use(authenticate);
router.use(tenantContext);

/**
 * Deep merge settings, preserving nested structure
 */
function mergeSettings(
  existing: OrganizationSettings,
  updates: Partial<OrganizationSettings>
): OrganizationSettings {
  return {
    branding: {
      ...existing.branding,
      ...updates.branding,
    },
    defaults: {
      ...existing.defaults,
      ...updates.defaults,
    },
    features: {
      ...existing.features,
      ...updates.features,
    },
  };
}

/**
 * GET /api/v1/organizations/current
 * Get current user's organization
 */
router.get('/current', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw Errors.unauthorized('Authentication required');
    }

    const organization = await prisma.organization.findUnique({
      where: { id: req.user.organizationId },
    });

    if (!organization) {
      throw Errors.notFound('Organization not found');
    }

    // Merge with defaults for any missing settings
    const settings = mergeSettings(
      DEFAULT_ORGANIZATION_SETTINGS,
      organization.settings as OrganizationSettings || {}
    );

    res.json(
      successResponse({
        id: organization.id,
        name: organization.name,
        settings,
        createdAt: organization.createdAt.toISOString(),
      })
    );
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/v1/organizations/current
 * Update current user's organization (FIRM_ADMIN only)
 */
router.put(
  '/current',
  requireAdmin,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw Errors.unauthorized('Authentication required');
      }

      const validation = updateOrganizationSchema.safeParse(req.body);
      if (!validation.success) {
        throw Errors.validation('Invalid request body', validation.error.errors);
      }

      const { name, settings } = validation.data;

      // Get current organization
      const currentOrg = await prisma.organization.findUnique({
        where: { id: req.user.organizationId },
      });

      if (!currentOrg) {
        throw Errors.notFound('Organization not found');
      }

      // Merge settings if provided
      const updatedSettings = settings
        ? mergeSettings(
            currentOrg.settings as OrganizationSettings || DEFAULT_ORGANIZATION_SETTINGS,
            settings
          )
        : currentOrg.settings;

      // Update organization
      const organization = await prisma.organization.update({
        where: { id: req.user.organizationId },
        data: {
          ...(name && { name }),
          settings: updatedSettings as object,
        },
      });

      res.json(
        successResponse({
          id: organization.id,
          name: organization.name,
          settings: mergeSettings(
            DEFAULT_ORGANIZATION_SETTINGS,
            organization.settings as OrganizationSettings || {}
          ),
          updatedAt: organization.updatedAt.toISOString(),
        })
      );
    } catch (error) {
      next(error);
    }
  }
);

export default router;
