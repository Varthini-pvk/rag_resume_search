import express, { Request, Response, NextFunction, Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';
import pinoHttp from 'pino-http';

import config, { AppConfig } from './config';
import { getLogger, ILogger } from './modules/shared/logger';
import { createErrorResponse, ServiceError } from './modules/shared/errors';
import { HealthModule } from './modules/health';

/**
 * Extended Express Request with correlation ID
 */
declare global {
  namespace Express {
    interface Request {
      correlationId: string;
    }
  }
}

/**
 * Create Express application
 */
export function createApp(cfg: AppConfig): Express {
  const app = express();
  const logger = getLogger({ level: cfg.app.logLevel });

  // ============================================
  // Security & Middleware
  // ============================================

  // Security headers
  app.use(helmet());

  // CORS
  app.use(
    cors({
      origin: cfg.security.corsOrigin,
      credentials: true,
      optionsSuccessStatus: 200,
    })
  );

  // Body parsing
  app.use(express.json({ limit: '10kb' }));
  app.use(express.urlencoded({ limit: '10kb', extended: true }));

  // ============================================
  // Observability
  // ============================================

  // HTTP request logging
  app.use(pinoHttp({ logger: logger as any }));

  // Correlation ID middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    req.correlationId =
      (req.headers[cfg.correlationIdHeader] as string) || uuidv4();
    res.setHeader(cfg.correlationIdHeader, req.correlationId);
    logger.info({
      action: 'request_received',
      method: req.method,
      path: req.path,
      requestId: req.correlationId,
    });
    next();
  });

  // ============================================
  // Module Registration
  // ============================================

  // Health module
  const healthModule = new HealthModule(logger);
  app.use('/api/v1/health', healthModule.createRoutes());

  logger.info({
    action: 'modules_registered',
    modules: ['health'],
  });

  // ============================================
  // Default Routes
  // ============================================

  // Root endpoint
  app.get('/', (req: Request, res: Response) => {
    res.json({
      service: 'Resume Search RAG',
      version: '0.1.0',
      status: 'running',
      documentation: '/api/v1/health',
    });
  });

  // Health check (duplicate for easy access)
  app.get('/health', (req: Request, res: Response, next: NextFunction) => {
    healthModule.getController().getHealth(req, res, next);
  });

  // ============================================
  // 404 Handler
  // ============================================

  app.use((req: Request, res: Response) => {
    res.status(404).json({
      error: 'Not Found',
      code: 'NOT_FOUND',
      path: req.path,
      requestId: req.correlationId,
      timestamp: new Date().toISOString(),
    });
  });

  // ============================================
  // Error Handler (Last)
  // ============================================

  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    const requestId = req.correlationId;

    // Log error
    logger.error({
      action: 'request_failed',
      error: err.message,
      stack: err.stack,
      requestId,
      path: req.path,
      method: req.method,
    });

    // Determine status code
    let statusCode = 500;
    if (err instanceof ServiceError) {
      statusCode = err.statusCode;
    } else if (err.name === 'ValidationError') {
      statusCode = 400;
    }

    // Send error response
    const errorResponse = createErrorResponse(err, requestId);
    res.status(statusCode).json(errorResponse);
  });

  return app;
}

export default createApp;
