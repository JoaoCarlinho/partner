import express from 'express';
import cors from 'cors';
import authRouter from './handlers/auth.js';
import { errorHandler } from './middleware/errorHandler.js';
import { requestLogger, logger } from './middleware/logger.js';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(requestLogger);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/v1/auth', authRouter);

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
