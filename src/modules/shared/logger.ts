import pino from 'pino';

/**
 * Logger interface for dependency injection
 */
export interface ILogger {
  debug(obj: Record<string, any>, msg?: string): void;
  info(obj: Record<string, any>, msg?: string): void;
  warn(obj: Record<string, any>, msg?: string): void;
  error(obj: Record<string, any>, msg?: string): void;
}

/**
 * Pino logger implementation
 */
class PinoLogger implements ILogger {
  private logger: pino.Logger;

  constructor(options?: { level?: string; name?: string }) {
    this.logger = pino({
      level: options?.level || process.env.LOG_LEVEL || 'info',
      transport:
        process.env.NODE_ENV === 'development'
          ? {
              target: 'pino-pretty',
              options: {
                colorize: true,
                translateTime: 'SYS:standard',
                ignore: 'pid,hostname',
              },
            }
          : undefined,
      base: {
        service: options?.name || 'resume-search-rag',
        env: process.env.NODE_ENV || 'development',
      },
    });
  }

  debug(obj: Record<string, any>, msg?: string): void {
    this.logger.debug(obj, msg);
  }

  info(obj: Record<string, any>, msg?: string): void {
    this.logger.info(obj, msg);
  }

  warn(obj: Record<string, any>, msg?: string): void {
    this.logger.warn(obj, msg);
  }

  error(obj: Record<string, any>, msg?: string): void {
    this.logger.error(obj, msg);
  }

  /**
   * Child logger with additional context
   */
  child(obj: Record<string, any>): ILogger {
    const childLogger = this.logger.child(obj);
    const childInstance = Object.create(this);
    childInstance.logger = childLogger;
    return childInstance;
  }
}

// Singleton instance
let loggerInstance: ILogger | null = null;

/**
 * Get or create logger instance
 */
export function getLogger(options?: { level?: string; name?: string }): ILogger {
  if (!loggerInstance) {
    loggerInstance = new PinoLogger(options);
  }
  return loggerInstance;
}

export default PinoLogger;
