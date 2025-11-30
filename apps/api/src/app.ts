import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRouter from './handlers/auth.js';
import usersRouter from './handlers/users.js';
import organizationsRouter from './handlers/organizations.js';
import auditLogsRouter from './handlers/auditLogs.js';
import templatesRouter from './handlers/templates.js';
import complianceRouter from './handlers/compliance.js';
import demandsRouter from './handlers/demands.js';
import invitationsRouter from './handlers/invitations.js';
import debtorsRouter from './handlers/debtors.js';
import defendersRouter from './handlers/defenders.js';
import seedRouter from './handlers/seed.js';
import { errorHandler } from './middleware/errorHandler.js';
import { requestLogger, logger } from './middleware/logger.js';
import { requestId } from './middleware/requestId.js';
import { rateLimit } from './middleware/rateLimit.js';
import { prisma } from './lib/prisma.js';

const app = express();
export { app };

// Version from package.json (for health check)
const API_VERSION = process.env.npm_package_version || '0.1.0';

// Middleware stack (order matters)
// 1. Request ID for tracing
app.use(requestId);

// 2. Request logging
app.use(requestLogger);

// 3. CORS - allow multiple origins for dev/prod flexibility
const allowedOrigins = [
  process.env.CORS_ORIGIN,
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://d13ip2cieye91r.cloudfront.net', // AWS CloudFront frontend
].filter(Boolean) as string[];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, Postman, etc)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, origin);
    }
    return callback(null, false);
  },
  credentials: true, // Allow cookies
}));

// 4. Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

// Health check (no auth, no rate limit)
app.get('/health', async (_req, res) => {
  let databaseStatus = 'unknown';

  try {
    // Quick database connectivity check
    await prisma.$queryRaw`SELECT 1`;
    databaseStatus = 'connected';
  } catch {
    databaseStatus = 'disconnected';
  }

  res.json({
    status: databaseStatus === 'connected' ? 'healthy' : 'degraded',
    version: API_VERSION,
    timestamp: new Date().toISOString(),
    database: databaseStatus,
  });
});

// 5. Rate limiting (after health check)
app.use('/api', rateLimit());

// API Routes - full paths
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/users', usersRouter);
app.use('/api/v1/organizations', organizationsRouter);
app.use('/api/v1/audit-logs', auditLogsRouter);
app.use('/api/v1/templates', templatesRouter);
app.use('/api/v1/compliance', complianceRouter);
app.use('/api/v1/demands', demandsRouter);
app.use('/api/v1/invitations', invitationsRouter);
app.use('/api/v1/debtors', debtorsRouter);
app.use('/api/v1/defenders', defendersRouter);
app.use('/api/v1/seed', seedRouter);

// Mount demands routes at root to handle API Gateway path stripping
// API Gateway with {proxy+} may pass only the captured segment
app.use('/', demandsRouter);

// Error handling (must be last)
app.use(errorHandler);

// Start server if not in Lambda (either dev mode or Docker mode)
if (process.env.NODE_ENV !== 'production' || process.env.DOCKER_MODE === 'true') {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    logger.info(`API server running on http://localhost:${PORT}`);
  });
}

export default app;
