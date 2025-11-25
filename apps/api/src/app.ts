import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRouter from './handlers/auth.js';
import usersRouter from './handlers/users.js';
import organizationsRouter from './handlers/organizations.js';
import { errorHandler } from './middleware/errorHandler.js';
import { requestLogger, logger } from './middleware/logger.js';

const app = express();
export { app };

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true, // Allow cookies
}));
app.use(express.json());
app.use(cookieParser());
app.use(requestLogger);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/users', usersRouter);
app.use('/api/v1/organizations', organizationsRouter);

// Error handling
app.use(errorHandler);

// Start server if not in Lambda
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    logger.info(`API server running on http://localhost:${PORT}`);
  });
}

export default app;
