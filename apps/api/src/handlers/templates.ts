import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import { successResponse } from '../lib/response.js';
import { Errors } from '../lib/errors.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { tenantContext } from '../middleware/tenantContext.js';
import { validate } from '../middleware/validate.js';
import { logAuditEvent } from '../services/audit/auditLogger.js';
import { AuditAction } from '@steno/shared';
import {
  createTemplateSchema,
  updateTemplateSchema,
  templatePreviewSchema,
  templateListQuerySchema,
  templateIdParamSchema,
  versionParamSchema,
  TemplateResponse,
  TemplateVersionResponse,
} from '@steno/shared';
import {
  extractVariables,
  validateFdcpaVariables,
  renderTemplate,
  getSampleData,
} from '@steno/shared';

const router = Router();

// All routes require authentication and tenant context
router.use(authenticate);
router.use(tenantContext);

/**
 * Transform Prisma template to API response
 */
function toTemplateResponse(template: {
  id: string;
  name: string;
  description: string | null;
  content: string;
  variables: unknown;
  version: number;
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}): TemplateResponse {
  return {
    id: template.id,
    name: template.name,
    description: template.description,
    content: template.content,
    variables: template.variables as string[],
    version: template.version,
    isActive: template.isActive,
    createdBy: template.createdBy,
    createdAt: template.createdAt.toISOString(),
    updatedAt: template.updatedAt.toISOString(),
  };
}

/**
 * POST /api/v1/templates
 * Create a new template (requires templates:manage permission)
 */
router.post(
  '/',
  authorize('templates:manage'),
  validate({ body: createTemplateSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw Errors.unauthorized('Authentication required');
      }

      const { name, description, content } = req.body;

      // Extract and validate variables
      const variables = extractVariables(content);
      const fdcpaValidation = validateFdcpaVariables(content);

      if (!fdcpaValidation.valid) {
        throw Errors.validation('Template missing required FDCPA variables', [
          {
            path: ['content'],
            message: `Missing required variables: ${fdcpaValidation.missing.join(', ')}`,
          },
        ]);
      }

      // Check for duplicate template name in organization
      const existing = await prisma.template.findUnique({
        where: {
          organizationId_name: {
            organizationId: req.user.org_id,
            name,
          },
        },
      });

      if (existing) {
        throw Errors.conflict('A template with this name already exists');
      }

      const template = await prisma.template.create({
        data: {
          organizationId: req.user.org_id,
          name,
          description: description || null,
          content,
          variables,
          createdBy: req.user.sub,
        },
      });

      // Audit log
      logAuditEvent(req, {
        action: AuditAction.TEMPLATE_CREATED,
        entityType: 'template',
        entityId: template.id,
        metadata: { name, variableCount: variables.length },
      });

      res.status(201).json(successResponse(toTemplateResponse(template)));
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/templates
 * List templates for current organization
 */
router.get(
  '/',
  authorize('templates:view'),
  validate({ query: templateListQuerySchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw Errors.unauthorized('Authentication required');
      }

      const { cursor, limit, isActive, search, createdBy } = req.query as {
        cursor?: string;
        limit: number;
        isActive?: boolean;
        search?: string;
        createdBy?: string;
      };

      // Build where clause
      const where: {
        organizationId: string;
        isActive?: boolean;
        createdBy?: string;
        name?: { contains: string; mode: 'insensitive' };
      } = {
        organizationId: req.user.org_id,
      };

      if (isActive !== undefined) {
        where.isActive = isActive;
      }

      if (createdBy) {
        where.createdBy = createdBy;
      }

      if (search) {
        where.name = { contains: search, mode: 'insensitive' };
      }

      // Query with cursor pagination
      const templates = await prisma.template.findMany({
        where,
        take: limit + 1, // Fetch one extra to determine if there's more
        ...(cursor && {
          cursor: { id: cursor },
          skip: 1, // Skip cursor item
        }),
        orderBy: { createdAt: 'desc' },
      });

      // Determine if there are more results
      const hasMore = templates.length > limit;
      const items = hasMore ? templates.slice(0, -1) : templates;
      const nextCursor = hasMore ? items[items.length - 1]?.id : undefined;

      res.json(
        successResponse({
          items: items.map(toTemplateResponse),
          pagination: {
            nextCursor,
            hasMore,
          },
        })
      );
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/templates/:templateId
 * Get a single template
 */
router.get(
  '/:templateId',
  authorize('templates:view'),
  validate({ params: templateIdParamSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw Errors.unauthorized('Authentication required');
      }

      const { templateId } = req.params;

      const template = await prisma.template.findFirst({
        where: {
          id: templateId,
          organizationId: req.user.org_id,
        },
      });

      if (!template) {
        throw Errors.notFound('Template not found');
      }

      res.json(successResponse(toTemplateResponse(template)));
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/v1/templates/:templateId
 * Update a template (creates new version on content change)
 */
router.put(
  '/:templateId',
  authorize('templates:manage'),
  validate({ params: templateIdParamSchema, body: updateTemplateSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw Errors.unauthorized('Authentication required');
      }

      const { templateId } = req.params;
      const { name, description, content, isActive } = req.body;

      // Get current template
      const current = await prisma.template.findFirst({
        where: {
          id: templateId,
          organizationId: req.user.org_id,
        },
      });

      if (!current) {
        throw Errors.notFound('Template not found');
      }

      // Check for name conflict if changing name
      if (name && name !== current.name) {
        const existing = await prisma.template.findUnique({
          where: {
            organizationId_name: {
              organizationId: req.user.org_id,
              name,
            },
          },
        });

        if (existing) {
          throw Errors.conflict('A template with this name already exists');
        }
      }

      // Determine if content is changing
      const contentChanged = content !== undefined && content !== current.content;

      // Validate new content if provided
      let variables = current.variables as string[];
      if (content) {
        variables = extractVariables(content);
        const fdcpaValidation = validateFdcpaVariables(content);

        if (!fdcpaValidation.valid) {
          throw Errors.validation('Template missing required FDCPA variables', [
            {
              path: ['content'],
              message: `Missing required variables: ${fdcpaValidation.missing.join(', ')}`,
            },
          ]);
        }
      }

      // If content changed, save current version before updating
      if (contentChanged) {
        await prisma.templateVersion.create({
          data: {
            templateId: current.id,
            version: current.version,
            content: current.content,
            variables: current.variables,
          },
        });
      }

      // Update template
      const updated = await prisma.template.update({
        where: { id: templateId },
        data: {
          ...(name !== undefined && { name }),
          ...(description !== undefined && { description }),
          ...(content !== undefined && { content }),
          ...(variables && { variables }),
          ...(isActive !== undefined && { isActive }),
          ...(contentChanged && { version: current.version + 1 }),
        },
      });

      // Audit log
      logAuditEvent(req, {
        action: AuditAction.TEMPLATE_UPDATED,
        entityType: 'template',
        entityId: updated.id,
        metadata: {
          changes: {
            name: name !== current.name,
            content: contentChanged,
            isActive: isActive !== current.isActive,
          },
          newVersion: updated.version,
        },
      });

      res.json(successResponse(toTemplateResponse(updated)));
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/v1/templates/:templateId
 * Soft delete a template (sets isActive=false)
 */
router.delete(
  '/:templateId',
  authorize('templates:manage'),
  validate({ params: templateIdParamSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw Errors.unauthorized('Authentication required');
      }

      const { templateId } = req.params;

      const template = await prisma.template.findFirst({
        where: {
          id: templateId,
          organizationId: req.user.org_id,
        },
      });

      if (!template) {
        throw Errors.notFound('Template not found');
      }

      // Soft delete
      await prisma.template.update({
        where: { id: templateId },
        data: { isActive: false },
      });

      // Audit log
      logAuditEvent(req, {
        action: AuditAction.TEMPLATE_DELETED,
        entityType: 'template',
        entityId: templateId,
        metadata: { name: template.name },
      });

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/templates/:templateId/versions
 * List version history for a template
 */
router.get(
  '/:templateId/versions',
  authorize('templates:view'),
  validate({ params: templateIdParamSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw Errors.unauthorized('Authentication required');
      }

      const { templateId } = req.params;

      // Verify template exists and belongs to organization
      const template = await prisma.template.findFirst({
        where: {
          id: templateId,
          organizationId: req.user.org_id,
        },
      });

      if (!template) {
        throw Errors.notFound('Template not found');
      }

      // Get all versions (including current as most recent)
      const versions = await prisma.templateVersion.findMany({
        where: { templateId },
        orderBy: { version: 'desc' },
      });

      // Add current version to the list
      const currentVersion: TemplateVersionResponse = {
        id: template.id,
        templateId: template.id,
        version: template.version,
        content: template.content,
        variables: template.variables as string[],
        createdAt: template.updatedAt.toISOString(),
      };

      const allVersions = [
        currentVersion,
        ...versions.map((v) => ({
          id: v.id,
          templateId: v.templateId,
          version: v.version,
          content: v.content,
          variables: v.variables as string[],
          createdAt: v.createdAt.toISOString(),
        })),
      ];

      res.json(successResponse({ versions: allVersions }));
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/templates/:templateId/restore/:version
 * Restore a previous version of a template
 */
router.post(
  '/:templateId/restore/:version',
  authorize('templates:manage'),
  validate({ params: versionParamSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw Errors.unauthorized('Authentication required');
      }

      const { templateId, version } = req.params;
      const versionNumber = parseInt(version, 10);

      // Verify template exists and belongs to organization
      const template = await prisma.template.findFirst({
        where: {
          id: templateId,
          organizationId: req.user.org_id,
        },
      });

      if (!template) {
        throw Errors.notFound('Template not found');
      }

      // Find the version to restore
      const versionToRestore = await prisma.templateVersion.findUnique({
        where: {
          templateId_version: {
            templateId,
            version: versionNumber,
          },
        },
      });

      if (!versionToRestore) {
        throw Errors.notFound(`Version ${versionNumber} not found`);
      }

      // Save current version before restoring
      await prisma.templateVersion.create({
        data: {
          templateId: template.id,
          version: template.version,
          content: template.content,
          variables: template.variables,
        },
      });

      // Update template with restored content
      const updated = await prisma.template.update({
        where: { id: templateId },
        data: {
          content: versionToRestore.content,
          variables: versionToRestore.variables,
          version: template.version + 1,
        },
      });

      // Audit log
      logAuditEvent(req, {
        action: AuditAction.TEMPLATE_UPDATED,
        entityType: 'template',
        entityId: updated.id,
        metadata: {
          action: 'restore',
          restoredVersion: versionNumber,
          newVersion: updated.version,
        },
      });

      res.json(successResponse(toTemplateResponse(updated)));
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/templates/:templateId/preview
 * Generate a preview of the template with sample data
 */
router.post(
  '/:templateId/preview',
  authorize('templates:view'),
  validate({ params: templateIdParamSchema, body: templatePreviewSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw Errors.unauthorized('Authentication required');
      }

      const { templateId } = req.params;
      const { sampleData } = req.body;

      const template = await prisma.template.findFirst({
        where: {
          id: templateId,
          organizationId: req.user.org_id,
        },
      });

      if (!template) {
        throw Errors.notFound('Template not found');
      }

      // Merge provided data with defaults
      const defaultSampleData = getSampleData();
      const mergedData = { ...defaultSampleData, ...sampleData };

      // Render template
      const { rendered, missing } = renderTemplate(template.content, mergedData);

      // Escape HTML for safe display
      const escapedContent = rendered
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');

      res.json(
        successResponse({
          renderedContent: escapedContent,
          missingVariables: missing,
        })
      );
    } catch (error) {
      next(error);
    }
  }
);

export default router;
