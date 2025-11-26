/**
 * Swagger/OpenAPI Documentation Configuration
 * Provides comprehensive API documentation for the platform
 */

import swaggerJsdoc from 'swagger-jsdoc';

// API Information
const apiInfo = {
  title: 'Debt Resolution Platform API',
  version: '1.0.0',
  description: `
## Overview

The Debt Resolution Platform API provides a comprehensive set of endpoints for managing debt resolution workflows,
including creditor-debtor communication, payment plan negotiation, and public defender assistance.

## Authentication

Most endpoints require authentication using JWT tokens. Include the token in the Authorization header:

\`\`\`
Authorization: Bearer <your-jwt-token>
\`\`\`

## Rate Limiting

API requests are rate-limited to prevent abuse:
- **Standard endpoints:** 100 requests per minute
- **Authentication endpoints:** 10 requests per minute
- **File upload endpoints:** 20 requests per minute

## Error Handling

All errors follow a consistent format:

\`\`\`json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {} // Optional additional details
  }
}
\`\`\`

## Versioning

The API uses URL-based versioning. Current version: \`v1\`

All endpoints are prefixed with \`/api/v1/\`
  `,
  termsOfService: 'https://platform.example.com/terms',
  contact: {
    name: 'API Support',
    url: 'https://platform.example.com/support',
    email: 'api-support@example.com',
  },
  license: {
    name: 'Proprietary',
    url: 'https://platform.example.com/license',
  },
};

// Server configurations
const servers = [
  {
    url: 'http://localhost:3000/api/v1',
    description: 'Development server',
  },
  {
    url: 'https://staging-api.platform.example.com/api/v1',
    description: 'Staging server',
  },
  {
    url: 'https://api.platform.example.com/api/v1',
    description: 'Production server',
  },
];

// Security schemes
const securitySchemes = {
  bearerAuth: {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT',
    description: 'JWT authentication token',
  },
  apiKey: {
    type: 'apiKey',
    in: 'header',
    name: 'X-API-Key',
    description: 'API key for service-to-service communication',
  },
};

// Tag definitions for grouping endpoints
const tags = [
  {
    name: 'Authentication',
    description: 'User authentication and session management',
  },
  {
    name: 'Users',
    description: 'User profile management',
  },
  {
    name: 'Organizations',
    description: 'Organization and team management',
  },
  {
    name: 'Debtors',
    description: 'Debtor onboarding and profile management',
  },
  {
    name: 'Creditors',
    description: 'Creditor operations and debt management',
  },
  {
    name: 'Cases',
    description: 'Debt case management',
  },
  {
    name: 'Communications',
    description: 'Messaging and communication between parties',
  },
  {
    name: 'Plans',
    description: 'Payment plan creation and management',
  },
  {
    name: 'Public Defenders',
    description: 'Public defender operations and case management',
  },
  {
    name: 'Analytics',
    description: 'Platform analytics and reporting',
  },
  {
    name: 'Admin',
    description: 'Administrative operations',
  },
];

// Common response schemas
const commonSchemas = {
  Error: {
    type: 'object',
    properties: {
      error: {
        type: 'object',
        properties: {
          code: {
            type: 'string',
            description: 'Error code for programmatic handling',
            example: 'VALIDATION_ERROR',
          },
          message: {
            type: 'string',
            description: 'Human-readable error message',
            example: 'Invalid email format',
          },
          details: {
            type: 'object',
            description: 'Additional error details',
            additionalProperties: true,
          },
        },
        required: ['code', 'message'],
      },
    },
  },
  Pagination: {
    type: 'object',
    properties: {
      page: {
        type: 'integer',
        description: 'Current page number',
        example: 1,
      },
      limit: {
        type: 'integer',
        description: 'Items per page',
        example: 20,
      },
      total: {
        type: 'integer',
        description: 'Total number of items',
        example: 100,
      },
      totalPages: {
        type: 'integer',
        description: 'Total number of pages',
        example: 5,
      },
    },
  },
  User: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        format: 'uuid',
        description: 'User unique identifier',
      },
      email: {
        type: 'string',
        format: 'email',
        description: 'User email address',
      },
      firstName: {
        type: 'string',
        description: 'User first name',
      },
      lastName: {
        type: 'string',
        description: 'User last name',
      },
      role: {
        type: 'string',
        enum: ['admin', 'creditor', 'debtor', 'public_defender'],
        description: 'User role',
      },
      organizationId: {
        type: 'string',
        format: 'uuid',
        description: 'Associated organization ID',
      },
      createdAt: {
        type: 'string',
        format: 'date-time',
        description: 'Account creation timestamp',
      },
      updatedAt: {
        type: 'string',
        format: 'date-time',
        description: 'Last update timestamp',
      },
    },
  },
  Case: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        format: 'uuid',
        description: 'Case unique identifier',
      },
      debtorId: {
        type: 'string',
        format: 'uuid',
        description: 'Associated debtor ID',
      },
      creditorId: {
        type: 'string',
        format: 'uuid',
        description: 'Associated creditor ID',
      },
      originalAmount: {
        type: 'number',
        format: 'double',
        description: 'Original debt amount',
      },
      currentBalance: {
        type: 'number',
        format: 'double',
        description: 'Current balance owed',
      },
      status: {
        type: 'string',
        enum: ['open', 'in_negotiation', 'plan_active', 'resolved', 'disputed'],
        description: 'Case status',
      },
      createdAt: {
        type: 'string',
        format: 'date-time',
      },
      updatedAt: {
        type: 'string',
        format: 'date-time',
      },
    },
  },
  PaymentPlan: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        format: 'uuid',
      },
      caseId: {
        type: 'string',
        format: 'uuid',
      },
      monthlyAmount: {
        type: 'number',
        format: 'double',
        description: 'Monthly payment amount',
      },
      totalAmount: {
        type: 'number',
        format: 'double',
        description: 'Total amount to be paid',
      },
      duration: {
        type: 'integer',
        description: 'Plan duration in months',
      },
      status: {
        type: 'string',
        enum: ['proposed', 'accepted', 'active', 'completed', 'defaulted'],
      },
      startDate: {
        type: 'string',
        format: 'date',
      },
      nextPaymentDate: {
        type: 'string',
        format: 'date',
      },
    },
  },
  Message: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        format: 'uuid',
      },
      senderId: {
        type: 'string',
        format: 'uuid',
      },
      recipientId: {
        type: 'string',
        format: 'uuid',
      },
      content: {
        type: 'string',
      },
      channel: {
        type: 'string',
        enum: ['creditor_debtor', 'defender_debtor', 'system'],
      },
      readAt: {
        type: 'string',
        format: 'date-time',
        nullable: true,
      },
      createdAt: {
        type: 'string',
        format: 'date-time',
      },
    },
  },
  DefenderAssignment: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        format: 'uuid',
      },
      defenderId: {
        type: 'string',
        format: 'uuid',
      },
      debtorId: {
        type: 'string',
        format: 'uuid',
      },
      caseId: {
        type: 'string',
        format: 'uuid',
      },
      status: {
        type: 'string',
        enum: ['pending_consent', 'active', 'completed', 'transferred'],
      },
      requestedBy: {
        type: 'string',
        enum: ['debtor', 'admin', 'defender'],
      },
      debtorConsentedAt: {
        type: 'string',
        format: 'date-time',
        nullable: true,
      },
      assignedAt: {
        type: 'string',
        format: 'date-time',
        nullable: true,
      },
      createdAt: {
        type: 'string',
        format: 'date-time',
      },
    },
  },
  DefenderNote: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        format: 'uuid',
      },
      defenderId: {
        type: 'string',
        format: 'uuid',
      },
      assignmentId: {
        type: 'string',
        format: 'uuid',
      },
      category: {
        type: 'string',
        enum: [
          'INITIAL_ASSESSMENT',
          'FINANCIAL_GUIDANCE',
          'COMMUNICATION_COACHING',
          'PLAN_RECOMMENDATIONS',
          'FOLLOW_UP_REQUIRED',
          'CASE_RESOLUTION',
          'GENERAL',
        ],
      },
      title: {
        type: 'string',
      },
      content: {
        type: 'string',
      },
      visibleToDebtor: {
        type: 'boolean',
        default: false,
      },
      pinned: {
        type: 'boolean',
        default: false,
      },
      createdAt: {
        type: 'string',
        format: 'date-time',
      },
      updatedAt: {
        type: 'string',
        format: 'date-time',
      },
    },
  },
};

// Swagger JSDoc options
export const swaggerOptions: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.3',
    info: apiInfo,
    servers,
    tags,
    components: {
      securitySchemes,
      schemas: commonSchemas,
      responses: {
        UnauthorizedError: {
          description: 'Authentication required or token invalid',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                error: {
                  code: 'UNAUTHORIZED',
                  message: 'Invalid or expired authentication token',
                },
              },
            },
          },
        },
        ForbiddenError: {
          description: 'Insufficient permissions for this operation',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                error: {
                  code: 'FORBIDDEN',
                  message: 'You do not have permission to perform this action',
                },
              },
            },
          },
        },
        NotFoundError: {
          description: 'Requested resource not found',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                error: {
                  code: 'NOT_FOUND',
                  message: 'The requested resource was not found',
                },
              },
            },
          },
        },
        ValidationError: {
          description: 'Request validation failed',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                error: {
                  code: 'VALIDATION_ERROR',
                  message: 'Request validation failed',
                  details: {
                    email: 'Invalid email format',
                  },
                },
              },
            },
          },
        },
        RateLimitError: {
          description: 'Too many requests',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                error: {
                  code: 'RATE_LIMITED',
                  message: 'Too many requests, please try again later',
                },
              },
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: [
    './src/handlers/**/*.ts',
    './src/routes/**/*.ts',
    './src/docs/paths/**/*.yaml',
  ],
};

// Generate swagger spec
export const swaggerSpec = swaggerJsdoc(swaggerOptions);

export default swaggerSpec;
