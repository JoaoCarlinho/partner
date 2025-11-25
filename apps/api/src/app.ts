import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRouter from './handlers/auth.js';
import usersRouter from './handlers/users.js';
import organizationsRouter from './handlers/organizations.js';
import auditLogsRouter from './handlers/auditLogs.js';
import templatesRouter from './handlers/templates.js';
import complianceRouter from './handlers/compliance.js';
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

// 3. CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
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

// API Routes
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/users', usersRouter);
app.use('/api/v1/organizations', organizationsRouter);
app.use('/api/v1/audit-logs', auditLogsRouter);
app.use('/api/v1/templates', templatesRouter);
app.use('/api/v1/compliance', complianceRouter);

// Error handling (must be last)
app.use(errorHandler);

// Start server if not in Lambda
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    logger.info(`API server running on http://localhost:${PORT}`);
  });
}

export default app;
