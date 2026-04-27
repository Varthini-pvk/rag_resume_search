import { ILogger } from '../../shared/logger';
import { ServiceError } from '../../shared/errors';
import { IHealthService, HealthStatus, ComponentHealth } from '../interface/health.interface';
import { IDBService } from '../../db';

/**
 * Health check service - monitors system status
 */
export class HealthService implements IHealthService {
  private startTime = Date.now();

  constructor(
    private readonly logger: ILogger,
    private readonly dbService?: IDBService
  ) {}

  async getHealthStatus(): Promise<HealthStatus> {
    const startTime = Date.now();

    try {
      const uptime = (Date.now() - this.startTime) / 1000; // in seconds

      // Check app health
      const appHealth: ComponentHealth = {
        status: 'healthy',
        latency: Date.now() - startTime,
      };
      const mongodbHealth = this.dbService
        ? await this.dbService.checkHealth()
        : undefined;

      let overallStatus: HealthStatus['status'] = 'healthy';
      if (mongodbHealth?.status === 'unhealthy') {
        overallStatus = 'degraded';
      }

      const status: HealthStatus = {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        uptime,
        components: {
          app: appHealth,
          ...(mongodbHealth ? { mongodb: mongodbHealth } : {}),
        },
        version: process.env.npm_package_version || '0.1.0',
      };

      this.logger.info({
        action: 'health_check_completed',
        module: 'health',
        duration: Date.now() - startTime,
        status: status.status,
      });

      return status;
    } catch (error) {
      this.logger.error({
        action: 'health_check_failed',
        module: 'health',
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'HEALTH_CHECK_ERROR',
      });

      throw new ServiceError(
        'HEALTH_CHECK_FAILED',
        'Failed to perform health check',
        503
      );
    }
  }
}
