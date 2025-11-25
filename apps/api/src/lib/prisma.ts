import { PrismaClient, Prisma } from '@prisma/client';
import { getTenantContextOrNull } from '../middleware/tenantContext.js';

// Models that require organization_id filtering
const TENANT_SCOPED_MODELS = [
  'User',
  'Template',
  'Case',
  'DemandLetter',
  'OrganizationInvite',
] as const;

type TenantScopedModel = (typeof TENANT_SCOPED_MODELS)[number];

// Operations that need tenant filtering
const READ_OPERATIONS = ['findUnique', 'findFirst', 'findMany', 'count', 'aggregate', 'groupBy'];
const WRITE_OPERATIONS = ['update', 'updateMany', 'delete', 'deleteMany'];
const CREATE_OPERATIONS = ['create', 'createMany'];

function isTenantScopedModel(model: string | undefined): model is TenantScopedModel {
  return model !== undefined && TENANT_SCOPED_MODELS.includes(model as TenantScopedModel);
}

// Global singleton to prevent multiple instances in development (hot reload)
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

  // Tenant isolation middleware
  client.$use(async (params: Prisma.MiddlewareParams, next) => {
    const context = getTenantContextOrNull();

    // Skip tenant filtering if no context (unauthenticated routes)
    if (!context) {
      return next(params);
    }

    const { model, action } = params;

    // Only apply to tenant-scoped models
    if (!isTenantScopedModel(model)) {
      return next(params);
    }

    const orgId = context.organizationId;

    // Inject organization_id filter for read operations
    if (READ_OPERATIONS.includes(action)) {
      params.args = params.args || {};
      params.args.where = {
        ...params.args.where,
        organizationId: orgId,
      };
    }

    // Inject organization_id filter for update/delete operations
    if (WRITE_OPERATIONS.includes(action)) {
      params.args = params.args || {};
      params.args.where = {
        ...params.args.where,
        organizationId: orgId,
      };
    }

    // Inject organization_id for create operations
    if (CREATE_OPERATIONS.includes(action)) {
      params.args = params.args || {};
      if (action === 'create') {
        params.args.data = {
          ...params.args.data,
          organizationId: orgId,
        };
      } else if (action === 'createMany' && Array.isArray(params.args.data)) {
        params.args.data = params.args.data.map((item: Record<string, unknown>) => ({
          ...item,
          organizationId: orgId,
        }));
      }
    }

    return next(params);
  });

  return client;
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
