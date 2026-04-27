import { ILogger } from '../../shared/logger';
import { HealthService } from '../service/health.service';
import { HealthController } from '../controller/health.controller';
import { createHealthRoutes } from '../route/health.route';

/**
 * Health module factory
 */
export class HealthModule {
  private service: HealthService;
  private controller: HealthController;

  constructor(private readonly logger: ILogger) {
    this.service = new HealthService(logger);
    this.controller = new HealthController(this.service);
  }

  /**
   * Get the controller for this module
   */
  getController(): HealthController {
    return this.controller;
  }

  /**
   * Get the service for this module
   */
  getService(): HealthService {
    return this.service;
  }

  /**
   * Create routes for this module
   */
  createRoutes() {
    return createHealthRoutes(this.controller);
  }
}

export default HealthModule;
