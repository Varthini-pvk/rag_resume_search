import { Request, Response, NextFunction } from 'express';
import { IHealthService } from '../interface/health.interface';
import { HealthResponseDto } from '../dto/health.response.dto';

/**
 * Health check controller - handles HTTP requests
 */
export class HealthController {
  constructor(private readonly healthService: IHealthService) {}

  /**
   * GET /api/v1/health
   * Returns current health status
   */
  async getHealth(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const healthStatus = await this.healthService.getHealthStatus();

      const response: HealthResponseDto = {
        ...healthStatus,
        requestId: (req as any).correlationId,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
}
