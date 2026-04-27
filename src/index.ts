import config from './config';
import { getLogger } from './modules/shared/logger';
import { createApp } from './app';

const logger = getLogger({ level: config.app.logLevel });

/**
 * Bootstrap and start the application
 */
async function bootstrap(): Promise<void> {
  try {
    logger.info({
      action: 'application_starting',
      environment: config.app.nodeEnv,
      port: config.app.port,
    });

    // Create Express app
    const app = createApp(config);

    // Start server
    const server = app.listen(config.app.port, () => {
      logger.info({
        action: 'server_listening',
        port: config.app.port,
        timestamp: new Date().toISOString(),
        message: `🚀 Resume Search RAG listening on port ${config.app.port}`,
      });
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info({
        action: 'shutdown_initiated',
        signal,
        timestamp: new Date().toISOString(),
      });

      server.close(() => {
        logger.info({
          action: 'server_stopped',
          timestamp: new Date().toISOString(),
        });
        process.exit(0);
      });

      // Force exit after 10 seconds
      setTimeout(() => {
        logger.error({
          action: 'forced_shutdown',
          message: 'Graceful shutdown timeout, forcing exit',
        });
        process.exit(1);
      }, 10000);
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error: Error) => {
      logger.error({
        action: 'uncaught_exception',
        error: error.message,
        stack: error.stack,
      });
      process.exit(1);
    });

    // Handle unhandled rejections
    process.on('unhandledRejection', (reason: any) => {
      logger.error({
        action: 'unhandled_rejection',
        reason: reason instanceof Error ? reason.message : String(reason),
      });
      process.exit(1);
    });
  } catch (error) {
    logger.error({
      action: 'bootstrap_failed',
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    process.exit(1);
  }
}

// Start application
bootstrap().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

export {};
